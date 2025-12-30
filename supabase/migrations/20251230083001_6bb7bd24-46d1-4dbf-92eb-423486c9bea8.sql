-- Update deliver_stop to bypass batch check for warehouse managers
-- and auto-create/receive batch if needed

CREATE OR REPLACE FUNCTION deliver_stop(
  p_room_order_id uuid,
  p_items_confirmed jsonb DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_room_order record;
  v_order record;
  v_batch record;
  v_transaction_code text;
  v_item record;
  v_is_warehouse_manager boolean := false;
  v_user_level text;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  
  -- Get room order info
  SELECT dor.*, r.room_number, r.floor as room_floor
  INTO v_room_order
  FROM distribution_order_rooms dor
  JOIN rooms r ON r.id = dor.room_id
  WHERE dor.id = p_room_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room order not found' USING ERRCODE = 'P0002';
  END IF;
  
  -- Get order info
  SELECT * INTO v_order
  FROM distribution_orders
  WHERE id = v_room_order.distribution_order_id;
  
  -- Check if user is warehouse manager (bypass assignment check)
  SELECT user_level_code INTO v_user_level
  FROM users
  WHERE id = v_actor_id;
  
  v_is_warehouse_manager := v_user_level IN ('tenant_owner', 'manager', 'warehouse_manager', 'hotel_manager');
  
  -- Validate actor is assigned (skip for warehouse managers)
  IF NOT v_is_warehouse_manager AND v_order.assigned_to IS NOT NULL AND v_order.assigned_to != v_actor_id THEN
    RAISE EXCEPTION 'You are not assigned to this route' USING ERRCODE = '42501';
  END IF;
  
  -- Get or create batch info
  SELECT * INTO v_batch
  FROM distribution_order_batches
  WHERE distribution_order_id = v_room_order.distribution_order_id
    AND batch_number = COALESCE(v_room_order.batch_number, 1);
  
  -- If batch doesn't exist, create it for warehouse managers
  IF NOT FOUND THEN
    IF v_is_warehouse_manager THEN
      INSERT INTO distribution_order_batches (
        distribution_order_id, 
        batch_number, 
        status, 
        handed_over_at, 
        handed_over_by,
        received_at,
        received_by
      )
      VALUES (
        v_room_order.distribution_order_id,
        COALESCE(v_room_order.batch_number, 1),
        'received',
        now(),
        v_actor_id,
        now(),
        v_actor_id
      )
      RETURNING * INTO v_batch;
    ELSE
      RAISE EXCEPTION 'Batch not found' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    -- Validate batch is received (warehouse managers can bypass)
    IF v_batch.status NOT IN ('received', 'done') THEN
      IF v_is_warehouse_manager THEN
        -- Auto-receive batch for warehouse managers
        UPDATE distribution_order_batches
        SET status = 'received',
            handed_over_at = COALESCE(handed_over_at, now()),
            handed_over_by = COALESCE(handed_over_by, v_actor_id),
            received_at = now(),
            received_by = v_actor_id,
            updated_at = now()
        WHERE id = v_batch.id;
      ELSE
        RAISE EXCEPTION 'Batch not received yet (status: %)', v_batch.status USING ERRCODE = '23505';
      END IF;
    END IF;
  END IF;
  
  -- Validate stop status
  IF v_room_order.stop_status NOT IN ('pending', 'cannot_access') THEN
    RAISE EXCEPTION 'Stop already processed (status: %)', v_room_order.stop_status USING ERRCODE = '23505';
  END IF;
  
  -- Update item quantities if provided
  IF p_items_confirmed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items_confirmed) AS x(item_id uuid, quantity_confirmed int)
    LOOP
      UPDATE distribution_order_items
      SET quantity_confirmed = v_item.quantity_confirmed,
          status = 'confirmed',
          updated_at = now()
      WHERE distribution_order_room_id = p_room_order_id
        AND item_id = v_item.item_id;
    END LOOP;
  ELSE
    -- Confirm all items with original quantity
    UPDATE distribution_order_items
    SET quantity_confirmed = quantity,
        status = 'confirmed',
        updated_at = now()
    WHERE distribution_order_room_id = p_room_order_id;
  END IF;
  
  -- Update room order status (sync both status and stop_status)
  UPDATE distribution_order_rooms
  SET stop_status = 'delivered',
      status = 'confirmed',
      delivered_at = now(),
      delivered_by = v_actor_id,
      confirmed_at = now(),
      confirmed_by = v_actor_id,
      exception_type = NULL,
      exception_reason = NULL,
      updated_at = now()
  WHERE id = p_room_order_id;
  
  -- Generate transaction code
  v_transaction_code := 'TXN-DL-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || LEFT(p_room_order_id::text, 8);
  
  -- Create inventory transactions: In-hand -> Room (only if warehouse manager - items come from warehouse directly)
  IF v_is_warehouse_manager THEN
    INSERT INTO inventory_transactions (
      tenant_id, hotel_id, item_id, quantity, quantity_before, quantity_after,
      transaction_type, transaction_category, transaction_code,
      related_type, related_id, from_location, to_location, created_by, notes
    )
    SELECT 
      v_order.tenant_id,
      v_order.hotel_id,
      doi.item_id,
      COALESCE(doi.quantity_confirmed, doi.quantity),
      i.quantity_in_stock,
      i.quantity_in_stock - COALESCE(doi.quantity_confirmed, doi.quantity),
      'out',
      'warehouse_release',
      v_transaction_code,
      'distribution_room',
      p_room_order_id,
      'warehouse',
      'room:' || v_room_order.room_number,
      v_actor_id,
      'Xuất kho trực tiếp từ Legacy View'
    FROM distribution_order_items doi
    JOIN items i ON i.id = doi.item_id
    WHERE doi.distribution_order_room_id = p_room_order_id;
    
    -- Update item quantities: reduce warehouse stock, increase in-use
    UPDATE items
    SET quantity_in_stock = quantity_in_stock - doi.qty,
        quantity_in_use = COALESCE(quantity_in_use, 0) + doi.qty,
        updated_at = now()
    FROM (
      SELECT item_id, COALESCE(quantity_confirmed, quantity) as qty
      FROM distribution_order_items
      WHERE distribution_order_room_id = p_room_order_id
    ) doi
    WHERE items.id = doi.item_id;
  ELSE
    -- Regular flow: items come from pending (in-hand)
    INSERT INTO inventory_transactions (
      tenant_id, hotel_id, item_id, quantity, quantity_before, quantity_after,
      transaction_type, transaction_category, transaction_code,
      related_type, related_id, to_location, created_by, notes
    )
    SELECT 
      v_order.tenant_id,
      v_order.hotel_id,
      doi.item_id,
      COALESCE(doi.quantity_confirmed, doi.quantity),
      i.quantity_pending,
      i.quantity_pending - COALESCE(doi.quantity_confirmed, doi.quantity),
      'out',
      'room_deliver',
      v_transaction_code,
      'distribution_room',
      p_room_order_id,
      'room:' || v_room_order.room_number,
      v_actor_id,
      'Giao hàng đến phòng'
    FROM distribution_order_items doi
    JOIN items i ON i.id = doi.item_id
    WHERE doi.distribution_order_room_id = p_room_order_id;
    
    -- Update item quantities: pending -> in_use
    UPDATE items
    SET quantity_pending = quantity_pending - doi.qty,
        quantity_in_use = COALESCE(quantity_in_use, 0) + doi.qty,
        updated_at = now()
    FROM (
      SELECT item_id, COALESCE(quantity_confirmed, quantity) as qty
      FROM distribution_order_items
      WHERE distribution_order_room_id = p_room_order_id
    ) doi
    WHERE items.id = doi.item_id;
  END IF;
  
  -- Update order progress
  UPDATE distribution_orders
  SET rooms_completed = (
        SELECT count(*) FROM distribution_order_rooms
        WHERE distribution_order_id = v_room_order.distribution_order_id
        AND stop_status IN ('delivered', 'resolved')
      ),
      status = CASE 
        WHEN (SELECT count(*) FROM distribution_order_rooms
              WHERE distribution_order_id = v_room_order.distribution_order_id
              AND stop_status NOT IN ('delivered', 'resolved')) = 0
        THEN 'completed'
        ELSE 'in_progress'
      END,
      started_at = COALESCE(started_at, now()),
      completed_at = CASE 
        WHEN (SELECT count(*) FROM distribution_order_rooms
              WHERE distribution_order_id = v_room_order.distribution_order_id
              AND stop_status NOT IN ('delivered', 'resolved')) = 0
        THEN now()
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = v_room_order.distribution_order_id;
  
  -- Check if all stops in batch are done, update batch status
  IF NOT EXISTS (
    SELECT 1 FROM distribution_order_rooms
    WHERE distribution_order_id = v_room_order.distribution_order_id
      AND batch_number = v_room_order.batch_number
      AND stop_status NOT IN ('delivered', 'resolved')
  ) THEN
    UPDATE distribution_order_batches
    SET status = 'done', updated_at = now()
    WHERE distribution_order_id = v_room_order.distribution_order_id
      AND batch_number = v_room_order.batch_number;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'room_order_id', p_room_order_id,
    'new_status', 'delivered',
    'is_warehouse_manager', v_is_warehouse_manager
  );
END;
$$;