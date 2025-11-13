-- Fix get_rooms_filtered function to calculate missing_items correctly
-- The function should compare room items against room_type_standards

CREATE OR REPLACE FUNCTION public.get_rooms_filtered(
  p_tenant_id UUID,
  p_hotel_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_floor INTEGER DEFAULT NULL,
  p_room_type TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  room_number TEXT,
  floor INTEGER,
  room_type TEXT,
  status TEXT,
  hotel_id UUID,
  hotel_name TEXT,
  total_items BIGINT,
  missing_items BIGINT,
  items_in_laundry BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.room_number,
    r.floor,
    r.room_type,
    r.status,
    r.hotel_id,
    h.name as hotel_name,
    COUNT(DISTINCT ri.item_id) as total_items,
    -- Count items where standard quantity > current quantity
    COUNT(DISTINCT CASE 
      WHEN rts.quantity > COALESCE(ri.quantity, 0) 
      THEN rts.item_id 
    END) as missing_items,
    COUNT(DISTINCT CASE 
      WHEN i.quantity_in_laundry > 0 
      THEN ri.item_id 
    END) as items_in_laundry
  FROM rooms r
  LEFT JOIN hotels h ON h.id = r.hotel_id
  LEFT JOIN room_type_standards rts ON rts.room_type = r.room_type 
    AND rts.tenant_id = r.tenant_id
  LEFT JOIN room_items ri ON ri.room_id = r.id 
    AND ri.item_id = rts.item_id
  LEFT JOIN items i ON i.id = ri.item_id
  WHERE r.tenant_id = p_tenant_id
    AND (p_hotel_id IS NULL OR r.hotel_id = p_hotel_id)
    AND (p_status IS NULL OR r.status = p_status)
    AND (p_floor IS NULL OR r.floor = p_floor)
    AND (p_room_type IS NULL OR r.room_type = p_room_type)
    AND (p_search IS NULL OR r.room_number ILIKE '%' || p_search || '%')
  GROUP BY r.id, r.room_number, r.floor, r.room_type, r.status, r.hotel_id, h.name
  ORDER BY r.room_number;
END;
$$;