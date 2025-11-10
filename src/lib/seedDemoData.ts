import { supabase } from '@/integrations/supabase/client'
import { subDays, addDays } from 'date-fns'

interface SeedProgress {
  step: string
  current: number
  total: number
  message: string
}

type ProgressCallback = (progress: SeedProgress) => void

export const seedDemoData = async (
  tenantId: string,
  hotelId: string,
  userId: string,
  onProgress?: ProgressCallback
) => {
  const updateProgress = (step: string, current: number, total: number, message: string) => {
    if (onProgress) {
      onProgress({ step, current, total, message })
    }
  }

  try {
    // 1. Create Categories (5)
    updateProgress('categories', 0, 15, '📂 Creating categories...')
    const categories = await createDemoCategories(tenantId)

    // 2. Create Items (50)
    updateProgress('items', 1, 15, '📦 Creating items...')
    const items = await createDemoItems(tenantId, hotelId, categories)

    // 3. Create Rooms (20)
    updateProgress('rooms', 2, 15, '🏠 Creating rooms...')
    const rooms = await createDemoRooms(tenantId, hotelId)

    // 4. Assign Items to Rooms
    updateProgress('room-items', 3, 15, '🔗 Assigning items to rooms...')
    await assignItemsToRooms(rooms, items)

    // 5. Create Room Type Standards
    updateProgress('standards', 4, 15, '📋 Creating room standards...')
    await createRoomStandards(tenantId, hotelId, items)

    // 6. Create Laundry Vendors (3)
    updateProgress('laundry-vendors', 5, 15, '🧺 Creating laundry vendors...')
    const laundryVendors = await createLaundryVendors(tenantId)

    // 7. Create Laundry Batches (10)
    updateProgress('batches', 6, 15, '📦 Creating laundry batches...')
    const batches = await createLaundryBatches(tenantId, hotelId, userId, laundryVendors, items)

    // 8. Create Vendors (10)
    updateProgress('vendors', 7, 15, '🏪 Creating vendors...')
    const vendors = await createVendors(tenantId)

    // 9. Create Purchase Orders (15)
    updateProgress('pos', 8, 15, '📝 Creating purchase orders...')
    const pos = await createPurchaseOrders(tenantId, hotelId, userId, vendors, items)

    // 10. Create Inventory Transactions (100)
    updateProgress('transactions', 9, 15, '📊 Creating transactions...')
    await createTransactions(tenantId, hotelId, userId, items, rooms, batches, pos)

    // 11. Create Stock Adjustments (5)
    updateProgress('adjustments', 10, 15, '🔧 Creating stock adjustments...')
    await createStockAdjustments(tenantId, hotelId, userId, items)

    // 12. Create Room Checks (30)
    updateProgress('checks', 11, 15, '✅ Creating room checks...')
    await createRoomChecks(userId, rooms)

    // 13. Create Maintenance Requests (10)
    updateProgress('maintenance', 12, 15, '🔧 Creating maintenance requests...')
    await createMaintenanceRequests(tenantId, hotelId, userId, rooms, items)

    // 14. Create Notifications (20)
    updateProgress('notifications', 13, 15, '🔔 Creating notifications...')
    await createNotifications(tenantId, userId)

    // 15. Create Activity Logs (50)
    updateProgress('logs', 14, 15, '📝 Creating activity logs...')
    await createActivityLogs(tenantId, userId)

    updateProgress('complete', 15, 15, '✅ Demo data seeding completed!')

    return {
      success: true,
      summary: {
        categories: categories.length,
        items: items.length,
        rooms: rooms.length,
        laundryVendors: laundryVendors.length,
        batches: batches.length,
        vendors: vendors.length,
        purchaseOrders: pos.length,
      }
    }
  } catch (error: any) {
    console.error('Seeding error:', error)
    throw new Error(`Failed to seed demo data: ${error.message}`)
  }
}

// Helper Functions

const createDemoCategories = async (tenantId: string) => {
  const categories = [
    { name: 'Đồ vải', name_en: 'Fabric & Linens', icon: 'shirt', color: '#3b82f6', sort_order: 1 },
    { name: 'Tiện nghi', name_en: 'Amenities', icon: 'sparkles', color: '#8b5cf6', sort_order: 2 },
    { name: 'Thiết bị điện', name_en: 'Electronics', icon: 'tv', color: '#10b981', sort_order: 3 },
    { name: 'Nội thất', name_en: 'Furniture', icon: 'sofa', color: '#f59e0b', sort_order: 4 },
    { name: 'Đồ vệ sinh', name_en: 'Cleaning Supplies', icon: 'spray', color: '#06b6d4', sort_order: 5 }
  ]

  const created = []
  for (const cat of categories) {
    const { data } = await supabase
      .from('item_categories')
      .insert({
        ...cat,
        tenant_id: tenantId,
        description: `Danh mục ${cat.name}`
      })
      .select()
      .single()
    
    if (data) created.push(data)
  }

  return created
}

const createDemoItems = async (tenantId: string, hotelId: string, categories: any[]) => {
  const itemsData: Record<string, any[]> = {
    'Đồ vải': [
      { name: 'Khăn tắm trắng', unit: 'cái', unit_price: 50000, quantity: 200, min: 50, max_wash: 100 },
      { name: 'Khăn mặt trắng', unit: 'cái', unit_price: 30000, quantity: 250, min: 60, max_wash: 100 },
      { name: 'Ga giường trắng', unit: 'bộ', unit_price: 200000, quantity: 100, min: 20, max_wash: 80 },
      { name: 'Vỏ gối trắng', unit: 'cái', unit_price: 50000, quantity: 150, min: 30, max_wash: 80 },
      { name: 'Chăn cotton', unit: 'cái', unit_price: 300000, quantity: 80, min: 15, max_wash: 50 },
      { name: 'Mền mỏng', unit: 'cái', unit_price: 250000, quantity: 60, min: 10, max_wash: 50 },
      { name: 'Khăn trải giường', unit: 'cái', unit_price: 150000, quantity: 40, min: 8, max_wash: 60 },
      { name: 'Rèm cửa', unit: 'bộ', unit_price: 500000, quantity: 25, min: 5, max_wash: 30 },
      { name: 'Khăn trải bàn', unit: 'cái', unit_price: 80000, quantity: 50, min: 10, max_wash: 80 },
      { name: 'Tạp dề', unit: 'cái', unit_price: 40000, quantity: 30, min: 5, max_wash: 100 }
    ],
    'Tiện nghi': [
      { name: 'Bàn chải đánh răng', unit: 'cái', unit_price: 5000, quantity: 500, min: 100 },
      { name: 'Kem đánh răng', unit: 'tuýp', unit_price: 8000, quantity: 400, min: 80 },
      { name: 'Dầu gội đầu', unit: 'chai', unit_price: 25000, quantity: 300, min: 50 },
      { name: 'Sữa tắm', unit: 'chai', unit_price: 25000, quantity: 300, min: 50 },
      { name: 'Lược', unit: 'cái', unit_price: 10000, quantity: 250, min: 50 },
      { name: 'Dép đi trong phòng', unit: 'đôi', unit_price: 30000, quantity: 200, min: 40 },
      { name: 'Bộ pha trà', unit: 'bộ', unit_price: 50000, quantity: 100, min: 20 },
      { name: 'Cà phê hòa tan', unit: 'gói', unit_price: 5000, quantity: 600, min: 100 },
      { name: 'Khăn giấy', unit: 'hộp', unit_price: 15000, quantity: 350, min: 60 },
      { name: 'Bông tẩy trang', unit: 'hộp', unit_price: 20000, quantity: 150, min: 30 }
    ],
    'Thiết bị điện': [
      { name: 'Tivi Samsung 55 inch', unit: 'cái', unit_price: 12000000, quantity: 25, min: 3 },
      { name: 'Tủ lạnh Mini 50L', unit: 'cái', unit_price: 3500000, quantity: 30, min: 5 },
      { name: 'Máy sấy tóc', unit: 'cái', unit_price: 350000, quantity: 35, min: 8 },
      { name: 'Ấm đun nước', unit: 'cái', unit_price: 300000, quantity: 40, min: 8 },
      { name: 'Remote tivi', unit: 'cái', unit_price: 150000, quantity: 30, min: 5 },
      { name: 'Điều hòa Daikin 12000BTU', unit: 'cái', unit_price: 8500000, quantity: 25, min: 3 },
      { name: 'Quạt trần', unit: 'cái', unit_price: 1200000, quantity: 20, min: 3 },
      { name: 'Đèn ngủ', unit: 'cái', unit_price: 200000, quantity: 50, min: 10 },
      { name: 'Két sắt điện tử', unit: 'cái', unit_price: 2500000, quantity: 28, min: 5 },
      { name: 'Điện thoại nội bộ', unit: 'cái', unit_price: 500000, quantity: 30, min: 5 }
    ],
    'Nội thất': [
      { name: 'Giường đôi 1m8', unit: 'cái', unit_price: 8000000, quantity: 20, min: 2 },
      { name: 'Gối nằm', unit: 'cái', unit_price: 150000, quantity: 60, min: 10 },
      { name: 'Tủ quần áo 3 cánh', unit: 'cái', unit_price: 5000000, quantity: 25, min: 3 },
      { name: 'Bàn làm việc', unit: 'cái', unit_price: 2000000, quantity: 28, min: 5 },
      { name: 'Ghế làm việc', unit: 'cái', unit_price: 1500000, quantity: 30, min: 5 },
      { name: 'Gương treo tường', unit: 'cái', unit_price: 500000, quantity: 35, min: 5 },
      { name: 'Tranh trang trí', unit: 'bức', unit_price: 300000, quantity: 40, min: 8 },
      { name: 'Thùng rác', unit: 'cái', unit_price: 100000, quantity: 50, min: 10 },
      { name: 'Móc treo quần áo', unit: 'cái', unit_price: 50000, quantity: 60, min: 12 },
      { name: 'Kệ để hành lý', unit: 'cái', unit_price: 800000, quantity: 25, min: 5 }
    ],
    'Đồ vệ sinh': [
      { name: 'Giấy vệ sinh', unit: 'cuộn', unit_price: 8000, quantity: 800, min: 150 },
      { name: 'Xà phòng rửa tay', unit: 'chai', unit_price: 30000, quantity: 200, min: 40 },
      { name: 'Túi đựng rác', unit: 'cuộn', unit_price: 25000, quantity: 150, min: 30 },
      { name: 'Nước lau sàn', unit: 'chai', unit_price: 40000, quantity: 80, min: 15 },
      { name: 'Chổi quét', unit: 'cái', unit_price: 50000, quantity: 40, min: 8 },
      { name: 'Cây lau nhà', unit: 'bộ', unit_price: 150000, quantity: 30, min: 6 },
      { name: 'Khăn lau', unit: 'cái', unit_price: 20000, quantity: 100, min: 20 },
      { name: 'Nước tẩy rửa', unit: 'chai', unit_price: 35000, quantity: 60, min: 12 },
      { name: 'Xịt thơm phòng', unit: 'chai', unit_price: 80000, quantity: 50, min: 10 },
      { name: 'Bàn chải toilet', unit: 'bộ', unit_price: 60000, quantity: 35, min: 7 }
    ]
  }

  const createdItems = []

  for (const [catName, items] of Object.entries(itemsData)) {
    const category = categories.find(c => c.name === catName)
    if (!category) continue

    for (const item of items) {
      const total = item.quantity
      const inStock = Math.floor(total * 0.6)
      const inUse = Math.floor(total * 0.35)
      const inLaundry = total - inStock - inUse

      const { data } = await supabase
        .from('items')
        .insert({
          tenant_id: tenantId,
          hotel_id: hotelId,
          category_id: category.id,
          name: item.name,
          unit: item.unit,
          unit_price: item.unit_price,
          quantity_total: total,
          quantity_in_stock: inStock,
          quantity_in_use: inUse,
          quantity_in_laundry: inLaundry,
          minimum_stock: item.min,
          reorder_point: item.min + 5,
          max_wash_cycles: item.max_wash || null,
          current_wash_cycles: item.max_wash ? Math.floor(Math.random() * item.max_wash * 0.3) : 0,
          status: 'active'
        } as any)
        .select()
        .single()

      if (data) createdItems.push(data)
    }
  }

  return createdItems
}

const createDemoRooms = async (tenantId: string, hotelId: string) => {
  const roomTypes: ('standard' | 'deluxe' | 'suite')[] = ['standard', 'deluxe', 'suite']
  const statuses: ('vacant' | 'occupied' | 'cleaning')[] = ['vacant', 'occupied', 'cleaning']
  
  const rooms = []
  let roomNum = 101

  // Floor 1: Standard rooms (1-8)
  for (let i = 0; i < 8; i++) {
    rooms.push({
      tenant_id: tenantId,
      hotel_id: hotelId,
      room_number: `${roomNum++}`,
      floor: 1,
      room_type: 'standard',
      status: statuses[i % 3],
      area_sqm: 25,
      max_guests: 2,
      bed_type: 'Giường đôi',
      base_price: 800000
    })
  }

  // Floor 2: Mix of Standard and Deluxe (201-208)
  roomNum = 201
  for (let i = 0; i < 8; i++) {
    rooms.push({
      tenant_id: tenantId,
      hotel_id: hotelId,
      room_number: `${roomNum++}`,
      floor: 2,
      room_type: i < 4 ? 'standard' : 'deluxe',
      status: statuses[i % 3],
      area_sqm: i < 4 ? 25 : 35,
      max_guests: i < 4 ? 2 : 3,
      bed_type: i < 4 ? 'Giường đôi' : '2 Giường đơn',
      base_price: i < 4 ? 800000 : 1200000
    })
  }

  // Floor 3: Deluxe and Suite (301-304)
  roomNum = 301
  for (let i = 0; i < 4; i++) {
    rooms.push({
      tenant_id: tenantId,
      hotel_id: hotelId,
      room_number: `${roomNum++}`,
      floor: 3,
      room_type: i < 2 ? 'deluxe' : 'suite',
      status: i === 0 ? 'vacant' : 'occupied',
      area_sqm: i < 2 ? 35 : 50,
      max_guests: i < 2 ? 3 : 4,
      bed_type: i < 2 ? '2 Giường đơn' : 'Giường King',
      base_price: i < 2 ? 1200000 : 2000000
    })
  }

  const created = []
  for (const room of rooms) {
    const { data } = await supabase
      .from('rooms')
      .insert(room)
      .select()
      .single()
    
    if (data) created.push(data)
  }

  return created
}

// ... Continue with remaining helper functions
const assignItemsToRooms = async (rooms: any[], items: any[]) => {
  // Assign items based on room type
  for (const room of rooms) {
    const itemsPerRoom = room.room_type === 'suite' ? 30 : room.room_type === 'deluxe' ? 25 : 20
    const selectedItems = items.slice(0, itemsPerRoom)

    for (const item of selectedItems) {
      await supabase
        .from('room_items')
        .insert({
          room_id: room.id,
          item_id: item.id,
          quantity: Math.ceil(Math.random() * 3),
          condition: 'good'
        })
    }
  }
}

const createRoomStandards = async (tenantId: string, hotelId: string, items: any[]) => {
  const standards = [
    { room_type: 'standard', item_count: 20 },
    { room_type: 'deluxe', item_count: 25 },
    { room_type: 'suite', item_count: 30 }
  ]

  for (const standard of standards) {
    const selectedItems = items.slice(0, standard.item_count)
    
    for (const item of selectedItems) {
      await supabase
        .from('room_type_standards')
        .insert({
          tenant_id: tenantId,
          hotel_id: hotelId,
          room_type: standard.room_type,
          item_id: item.id,
          quantity: Math.ceil(Math.random() * 3)
        })
    }
  }
}

const createLaundryVendors = async (tenantId: string) => {
  const vendors = [
    { name: 'Giặt Là Hoàng Gia', type: 'external', phone: '0901234567', price_per_kg: 25000 },
    { name: 'Giặt Là Cao Cấp', type: 'external', phone: '0907654321', price_per_kg: 30000 },
    { name: 'Giặt Nội Bộ', type: 'in_house', phone: '0909999999', price_per_kg: 15000 }
  ]

  const created = []
  for (const vendor of vendors) {
    const { data } = await supabase
      .from('laundry_vendors')
      .insert({
        tenant_id: tenantId,
        name: vendor.name,
        type: vendor.type,
        phone: vendor.phone,
        contract_info: { price_per_kg: vendor.price_per_kg },
        status: 'active'
      } as any)
      .select()
      .single()
    
    if (data) created.push(data)
  }

  return created
}

const createLaundryBatches = async (
  tenantId: string,
  hotelId: string,
  userId: string,
  vendors: any[],
  items: any[]
) => {
  const statuses = ['delivered', 'delivered', 'delivered', 'washing', 'washing', 'ready', 'ready', 'received', 'received', 'received']
  const created = []

  for (let i = 0; i < 10; i++) {
    const vendor = vendors[i % vendors.length]
    const status = statuses[i]
    const deliveryDate = subDays(new Date(), 10 - i)

    const { data: batch } = await supabase
      .from('laundry_batches')
      .insert({
        tenant_id: tenantId,
        hotel_id: hotelId,
        vendor_id: vendor.id,
        delivery_date: deliveryDate.toISOString(),
        expected_return_date: addDays(deliveryDate, 2).toISOString(),
        actual_return_date: status === 'received' ? addDays(deliveryDate, 2).toISOString() : null,
        delivery_staff_id: userId,
        return_staff_id: status === 'received' ? userId : null,
        total_items: 50 + i * 5,
        total_weight_kg: 25 + i * 2.5,
        estimated_cost: (25 + i * 2.5) * 25000,
        actual_cost: status === 'received' ? (25 + i * 2.5) * 25000 : null,
        status: status,
        quality_rating: status === 'received' ? 4 + Math.random() : null,
        timeliness_rating: status === 'received' ? 4 + Math.random() : null
      } as any)
      .select()
      .single()

    if (batch) created.push(batch)
  }

  return created
}

const createVendors = async (tenantId: string) => {
  const vendors = [
    { name: 'Công ty TNHH Nội Thất ABC', category: 'furniture', phone: '0281234567' },
    { name: 'Công ty CP Điện Máy XYZ', category: 'electronics', phone: '0287654321' },
    { name: 'Nhà Cung Cấp Vải', category: 'fabric', phone: '0283334444' },
    { name: 'Công Ty Vệ Sinh 123', category: 'cleaning', phone: '0285556666' },
    { name: 'Nhà Cung Cấp Amenities', category: 'amenities', phone: '0287778888' },
    { name: 'Công Ty Sửa Chữa Điện', category: 'services', phone: '0289990000' },
    { name: 'Nhà Cung Cấp Thiết Bị', category: 'equipment', phone: '0282223333' },
    { name: 'Công Ty Bảo Trì', category: 'services', phone: '0284445555' },
    { name: 'Nhà Cung Cấp F&B', category: 'food', phone: '0286667777' },
    { name: 'Công Ty IT Solutions', category: 'services', phone: '0288889999' }
  ]

  const created = []
  for (const vendor of vendors) {
    const { data } = await supabase
      .from('vendors')
      .insert({
        tenant_id: tenantId,
        name: vendor.name,
        category: vendor.category,
        phone: vendor.phone,
        status: 'active'
      } as any)
      .select()
      .single()
    
    if (data) created.push(data)
  }

  return created
}

const createPurchaseOrders = async (
  tenantId: string,
  hotelId: string,
  userId: string,
  vendors: any[],
  items: any[]
) => {
  const statuses = ['draft', 'draft', 'submitted', 'submitted', 'submitted', 'approved', 'approved', 'ordered', 'ordered', 'ordered', 'partial', 'partial', 'received', 'received', 'received']
  const created = []

  for (let i = 0; i < 15; i++) {
    const vendor = vendors[i % vendors.length]
    const status = statuses[i]
    const orderDate = subDays(new Date(), 15 - i)

    const { data: po } = await supabase
      .from('purchase_orders')
      .insert({
        tenant_id: tenantId,
        hotel_id: hotelId,
        vendor_id: vendor.id,
        requested_by: userId,
        order_date: orderDate.toISOString().split('T')[0],
        expected_delivery_date: addDays(orderDate, 7).toISOString().split('T')[0],
        actual_delivery_date: ['received', 'partial'].includes(status) ? addDays(orderDate, 7).toISOString().split('T')[0] : null,
        status: status,
        subtotal: 5000000 + i * 1000000,
        tax_amount: 0,
        shipping_fee: 0,
        total_amount: 5000000 + i * 1000000
      } as any)
      .select()
      .single()

    if (po) {
      // Add PO items
      const numItems = 3 + (i % 3)
      for (let j = 0; j < numItems; j++) {
        const item = items[(i * 3 + j) % items.length]
        await supabase
          .from('purchase_order_items')
          .insert({
            po_id: po.id,
            item_id: item.id,
            quantity_ordered: 10 + j * 5,
            quantity_received: status === 'received' ? 10 + j * 5 : status === 'partial' ? 5 + j * 2 : 0,
            unit_price: item.unit_price,
            total_price: (10 + j * 5) * item.unit_price
          })
      }
      created.push(po)
    }
  }

  return created
}

const createTransactions = async (
  tenantId: string,
  hotelId: string,
  userId: string,
  items: any[],
  rooms: any[],
  batches: any[],
  pos: any[]
) => {
  const types = ['in', 'out', 'in', 'out', 'in']
  const categories = ['purchase', 'room_usage', 'return', 'laundry', 'adjustment']

  for (let i = 0; i < 100; i++) {
    const item = items[i % items.length]
    const type = types[i % types.length]
    const category = categories[i % categories.length]
    const quantity = 1 + Math.floor(Math.random() * 5)

    await supabase
      .from('inventory_transactions')
      .insert({
        tenant_id: tenantId,
        hotel_id: hotelId,
        item_id: item.id,
        transaction_type: type,
        transaction_category: category,
        quantity: quantity,
        unit_price: item.unit_price,
        total_value: quantity * item.unit_price,
        quantity_before: item.quantity_in_stock,
        quantity_after: item.quantity_in_stock + (type === 'in' ? quantity : -quantity),
        created_by: userId,
        transaction_date: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString()
      } as any)
  }
}

const createStockAdjustments = async (
  tenantId: string,
  hotelId: string,
  userId: string,
  items: any[]
) => {
  const statuses = ['draft', 'in_progress', 'completed', 'completed', 'approved']

  for (let i = 0; i < 5; i++) {
    const { data: adjustment } = await supabase
      .from('stock_adjustments')
      .insert({
        tenant_id: tenantId,
        hotel_id: hotelId,
        adjustment_type: 'periodic',
        scheduled_date: subDays(new Date(), 5 - i).toISOString().split('T')[0],
        status: statuses[i],
        created_by: userId,
        notes: `Kiểm kê định kỳ tháng ${i + 1}`
      } as any)
      .select()
      .single()

    if (adjustment) {
      // Add adjustment items
      for (let j = 0; j < 10; j++) {
        const item = items[(i * 10 + j) % items.length]
        const systemQty = item.quantity_in_stock
        const actualQty = systemQty + Math.floor(Math.random() * 11) - 5 // +/- 5

        await supabase
          .from('stock_adjustment_items')
          .insert({
            adjustment_id: adjustment.id,
            item_id: item.id,
            system_quantity: systemQty,
            actual_quantity: actualQty,
            difference: actualQty - systemQty,
            status: statuses[i],
            checked_by: userId
          })
      }
    }
  }
}

const createRoomChecks = async (userId: string, rooms: any[]) => {
  const checkTypes = ['daily', 'checkout', 'checkin']

  for (let i = 0; i < 30; i++) {
    const room = rooms[i % rooms.length]
    const checkType = checkTypes[i % checkTypes.length]

    await supabase
      .from('room_checks')
      .insert({
        room_id: room.id,
        check_type: checkType,
        checked_by: userId,
        cleanliness_score: 80 + Math.floor(Math.random() * 20),
        items_complete: Math.random() > 0.2,
        items_missing: Math.random() > 0.8 ? [{ item: 'Towel', quantity: 1 }] : [],
        items_damaged: [],
        checked_at: subDays(new Date(), Math.floor(Math.random() * 7)).toISOString()
      })
  }
}

const createMaintenanceRequests = async (
  tenantId: string,
  hotelId: string,
  userId: string,
  rooms: any[],
  items: any[]
) => {
  const statuses = ['pending', 'pending', 'in_progress', 'in_progress', 'in_progress', 'completed', 'completed', 'completed', 'completed', 'completed']
  const priorities = ['low', 'medium', 'high']
  const issueTypes = ['electrical', 'plumbing', 'appliance', 'furniture', 'hvac']

  for (let i = 0; i < 10; i++) {
    const room = rooms[i % rooms.length]
    const item = items[i % items.length]

    await supabase
      .from('maintenance_requests')
      .insert({
        tenant_id: tenantId,
        hotel_id: hotelId,
        room_id: room.id,
        item_id: item.id,
        issue_type: issueTypes[i % issueTypes.length],
        priority: priorities[i % priorities.length],
        title: `Sửa chữa ${item.name} - Phòng ${room.room_number}`,
        description: `Cần kiểm tra và sửa chữa ${item.name}`,
        location: `Phòng ${room.room_number}`,
        status: statuses[i],
        reported_by: userId,
        reported_at: subDays(new Date(), 10 - i).toISOString()
      } as any)
  }
}

const createNotifications = async (tenantId: string, userId: string) => {
  const types = ['info', 'success', 'warning', 'error']
  const categories = ['system', 'inventory', 'room', 'laundry', 'maintenance']

  for (let i = 0; i < 20; i++) {
    await supabase
      .from('notifications')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        type: types[i % types.length],
        category: categories[i % categories.length],
        title: `Thông báo ${i + 1}`,
        message: `Nội dung thông báo số ${i + 1}`,
        is_read: i < 10
      })
  }
}

const createActivityLogs = async (tenantId: string, userId: string) => {
  const actions = ['create', 'update', 'delete', 'approve', 'reject']
  const entityTypes = ['item', 'room', 'batch', 'vendor', 'purchase_order']

  for (let i = 0; i < 50; i++) {
    await supabase
      .from('activity_logs')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        user_name: 'Demo User',
        user_role: 'owner',
        action: actions[i % actions.length],
        entity_type: entityTypes[i % entityTypes.length],
        entity_name: `Entity ${i + 1}`,
        description: `Performed ${actions[i % actions.length]} on ${entityTypes[i % entityTypes.length]}`
      })
  }
}
