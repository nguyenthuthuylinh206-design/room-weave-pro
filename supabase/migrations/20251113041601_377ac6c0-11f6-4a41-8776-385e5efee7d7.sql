-- Create RPC function to get room items with standards
-- This will return ALL standard items for a room type, joined with actual room_items quantities

CREATE OR REPLACE FUNCTION get_room_items_with_standards(p_room_id UUID)
RETURNS TABLE (
  standard_id UUID,
  room_item_id UUID,
  item_id UUID,
  item_code TEXT,
  item_name TEXT,
  item_thumbnail TEXT,
  category_name TEXT,
  standard_quantity INTEGER,
  current_quantity INTEGER,
  condition TEXT,
  is_verified BOOLEAN,
  verified_at TIMESTAMPTZ,
  verified_by UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_type TEXT;
  v_hotel_id UUID;
BEGIN
  -- Get room type and hotel_id
  SELECT rooms.room_type, rooms.hotel_id 
  INTO v_room_type, v_hotel_id
  FROM rooms 
  WHERE rooms.id = p_room_id;
  
  IF v_room_type IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  -- Return all standard items with actual quantities (if exist)
  RETURN QUERY
  SELECT 
    rts.id as standard_id,
    ri.id as room_item_id,
    rts.item_id,
    i.code as item_code,
    i.name as item_name,
    (SELECT url FROM item_images WHERE item_id = i.id AND is_primary = true LIMIT 1) as item_thumbnail,
    ic.name as category_name,
    rts.quantity as standard_quantity,
    COALESCE(ri.quantity, 0) as current_quantity,
    ri.condition,
    COALESCE(ri.is_verified, false) as is_verified,
    ri.verified_at,
    ri.verified_by
  FROM room_type_standards rts
  INNER JOIN items i ON i.id = rts.item_id
  LEFT JOIN item_categories ic ON ic.id = i.category_id
  LEFT JOIN room_items ri ON ri.room_id = p_room_id AND ri.item_id = rts.item_id
  WHERE rts.room_type = v_room_type
    AND rts.hotel_id = v_hotel_id
  ORDER BY i.name;
END;
$$;