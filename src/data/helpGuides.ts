import { 
  BedDouble, Shirt, Wrench, Package, ClipboardCheck, 
  UserCheck, CreditCard, CalendarPlus, Receipt, CalendarClock,
  Warehouse, LayoutGrid, BarChart3, Users,
  LayoutDashboard, CreditCard as CreditCardIcon, Building2, Settings,
  LucideIcon, TruckIcon, ClipboardList, ShieldCheck, Bell
} from 'lucide-react'

export interface GuideStep {
  title: string
  description: string
}

export interface HelpGuide {
  id: string
  title: string
  description: string
  icon: LucideIcon
  navigateTo?: string
  steps: GuideStep[]
  tips?: string[]
}

export interface RoleGuides {
  roleId: string
  roleLabel: string
  roleDescription: string
  guides: HelpGuide[]
}

export const helpGuides: RoleGuides[] = [
  {
    roleId: 'housekeeping',
    roleLabel: 'Nhân viên phòng',
    roleDescription: 'Hướng dẫn các thao tác kiểm tra phòng, gửi giặt, báo bảo trì và bổ sung đồ dùng',
    guides: [
      {
        id: 'room-check-checkin',
        title: 'Kiểm tra phòng khi khách nhận phòng (Check-in)',
        description: 'Kiểm tra và chuẩn bị phòng trước khi khách nhận phòng',
        icon: ClipboardCheck,
        navigateTo: '/rooms',
        steps: [
          { title: 'Vào trang Phòng', description: 'Chọn menu "Phòng" từ thanh điều hướng bên trái' },
          { title: 'Chọn phòng cần kiểm tra', description: 'Bấm vào phòng có trạng thái "Chờ check-in" hoặc phòng cần chuẩn bị' },
          { title: 'Bấm "Kiểm tra phòng"', description: 'Chọn loại kiểm tra "Check-in" từ menu' },
          { title: 'Kiểm tra từng hạng mục', description: 'Đánh dấu trạng thái các đồ dùng: đủ, thiếu, hỏng, cần thay' },
          { title: 'Ghi chú và hoàn thành', description: 'Thêm ghi chú nếu cần và bấm "Hoàn thành kiểm tra"' },
        ],
        tips: [
          'Nếu phát hiện đồ thiếu, hệ thống sẽ tự động tạo yêu cầu bổ sung',
          'Phòng sau check-in sẽ tự động chuyển trạng thái thành "Đang sử dụng"',
        ],
      },
      {
        id: 'room-check-checkout',
        title: 'Kiểm tra phòng khi khách trả phòng (Check-out)',
        description: 'Kiểm tra phòng sau khi khách trả, ghi nhận hư hỏng và mất mát',
        icon: ClipboardCheck,
        navigateTo: '/rooms',
        steps: [
          { title: 'Vào trang Phòng', description: 'Chọn phòng có trạng thái "Chờ check-out"' },
          { title: 'Bấm "Kiểm tra phòng"', description: 'Chọn loại "Check-out"' },
          { title: 'Kiểm tra đồ dùng', description: 'Ghi nhận số lượng đồ còn lại, đồ mất, đồ hỏng' },
          { title: 'Ghi nhận tiêu hao', description: 'Đánh dấu các đồ tiêu hao đã sử dụng (nước, snack...)' },
          { title: 'Hoàn thành', description: 'Bấm "Hoàn thành" — phòng sẽ tự chuyển sang "Cần dọn dẹp"' },
        ],
        tips: [
          'Đồ hỏng/mất sẽ tự động tạo yêu cầu bồi thường nếu được cấu hình',
          'Sau check-out, phòng tự động chuyển trạng thái sang "Cleaning"',
        ],
      },
      {
        id: 'room-check-daily',
        title: 'Kiểm tra phòng hàng ngày',
        description: 'Kiểm tra định kỳ hàng ngày để đảm bảo đồ dùng đầy đủ',
        icon: ClipboardCheck,
        navigateTo: '/rooms',
        steps: [
          { title: 'Vào trang Phòng', description: 'Chọn phòng đang có khách ở' },
          { title: 'Chọn "Kiểm tra hàng ngày"', description: 'Hệ thống hiển thị danh sách đồ dùng theo tiêu chuẩn phòng' },
          { title: 'Kiểm tra và cập nhật', description: 'Ghi nhận đồ đã sử dụng, cần bổ sung' },
          { title: 'Gửi yêu cầu bổ sung', description: 'Nếu thiếu, hệ thống sẽ tạo yêu cầu bổ sung tự động' },
        ],
      },
      {
        id: 'send-laundry',
        title: 'Gửi đồ đi giặt',
        description: 'Tạo lô giặt và gửi đồ cho đơn vị giặt ủi',
        icon: Shirt,
        navigateTo: '/laundry',
        steps: [
          { title: 'Vào trang Giặt là', description: 'Chọn "Giặt là" từ menu điều hướng' },
          { title: 'Bấm "Tạo lô giặt"', description: 'Chọn đơn vị giặt (vendor) từ danh sách' },
          { title: 'Thêm sản phẩm', description: 'Chọn loại đồ và nhập số lượng gửi giặt' },
          { title: 'Xác nhận và gửi', description: 'Kiểm tra lại và bấm "Tạo lô giặt"' },
        ],
        tips: [
          'Khi tạo lô giặt, số lượng tồn kho sẽ tự động giảm và chuyển sang "Đang giặt"',
          'Theo dõi trạng thái lô: Đã giao → Sẵn sàng → Đã nhận → Đã nhập kho',
        ],
      },
      {
        id: 'report-maintenance',
        title: 'Báo cáo bảo trì',
        description: 'Tạo yêu cầu sửa chữa khi phát hiện hư hỏng',
        icon: Wrench,
        navigateTo: '/maintenance',
        steps: [
          { title: 'Vào trang Bảo trì', description: 'Chọn "Bảo trì" từ menu' },
          { title: 'Bấm "Tạo yêu cầu"', description: 'Điền tiêu đề mô tả vấn đề' },
          { title: 'Chọn vị trí', description: 'Chọn phòng hoặc khu vực bị hư hỏng' },
          { title: 'Chọn mức độ ưu tiên', description: 'Thấp, Trung bình, Cao hoặc Khẩn cấp' },
          { title: 'Gửi yêu cầu', description: 'Bấm "Gửi" — quản lý sẽ nhận thông báo' },
        ],
      },
      {
        id: 'supplement-request',
        title: 'Yêu cầu bổ sung đồ dùng',
        description: 'Tạo yêu cầu bổ sung khi phòng thiếu đồ',
        icon: Package,
        navigateTo: '/inventory/supplements',
        steps: [
          { title: 'Vào trang Bổ sung', description: 'Chọn "Kho" → "Yêu cầu bổ sung" từ menu' },
          { title: 'Bấm "Tạo yêu cầu"', description: 'Chọn phòng cần bổ sung' },
          { title: 'Chọn sản phẩm', description: 'Chọn loại đồ dùng và số lượng cần bổ sung' },
          { title: 'Gửi yêu cầu', description: 'Bấm "Gửi" — kho sẽ chuẩn bị và giao hàng' },
        ],
      },
    ],
  },
  {
    roleId: 'frontdesk',
    roleLabel: 'Lễ tân',
    roleDescription: 'Hướng dẫn các thao tác check-in, check-out, booking và xử lý thanh toán',
    guides: [
      {
        id: 'guest-checkin',
        title: 'Check-in khách',
        description: 'Nhận phòng cho khách từ booking đã đặt trước',
        icon: UserCheck,
        navigateTo: '/bookings',
        steps: [
          { title: 'Vào trang Booking', description: 'Chọn "Booking" từ menu điều hướng' },
          { title: 'Tìm booking', description: 'Tìm theo tên khách, mã booking hoặc số phòng' },
          { title: 'Bấm "Check-in"', description: 'Xác nhận thông tin khách và phòng' },
          { title: 'Xác nhận giấy tờ', description: 'Kiểm tra CCCD/Passport, quét nếu cần' },
          { title: 'Hoàn tất', description: 'Bấm xác nhận — phòng chuyển sang "Đang sử dụng"' },
        ],
      },
      {
        id: 'guest-checkout',
        title: 'Check-out & Thanh toán',
        description: 'Trả phòng và xử lý thanh toán cho khách',
        icon: CreditCard,
        navigateTo: '/bookings',
        steps: [
          { title: 'Tìm booking đang ở', description: 'Vào trang Booking, lọc trạng thái "Đang ở"' },
          { title: 'Bấm "Check-out"', description: 'Hệ thống hiển thị tổng chi phí' },
          { title: 'Kiểm tra phụ thu', description: 'Xem các khoản phụ thu (minibar, dịch vụ, hư hỏng)' },
          { title: 'Xử lý thanh toán', description: 'Chọn phương thức: tiền mặt, thẻ, chuyển khoản' },
          { title: 'Hoàn tất', description: 'In hóa đơn nếu cần và xác nhận check-out' },
        ],
      },
      {
        id: 'create-booking',
        title: 'Tạo booking mới',
        description: 'Đặt phòng cho khách walk-in hoặc đặt trước',
        icon: CalendarPlus,
        navigateTo: '/bookings/new',
        steps: [
          { title: 'Bấm "Tạo booking"', description: 'Từ trang Booking, bấm nút "Tạo mới"' },
          { title: 'Nhập thông tin khách', description: 'Tên, SĐT, email, số giấy tờ' },
          { title: 'Chọn phòng và ngày', description: 'Chọn loại phòng, ngày nhận/trả phòng' },
          { title: 'Xác nhận giá', description: 'Kiểm tra giá phòng, áp dụng khuyến mãi nếu có' },
          { title: 'Lưu booking', description: 'Bấm "Tạo booking" để hoàn thành' },
        ],
      },
      {
        id: 'handle-surcharge',
        title: 'Xử lý phụ thu',
        description: 'Ghi nhận các khoản phụ thu minibar, dịch vụ trong thời gian khách ở',
        icon: Receipt,
        navigateTo: '/bookings',
        steps: [
          { title: 'Tìm booking đang ở', description: 'Vào booking của khách đang ở' },
          { title: 'Chọn tab "Phụ thu"', description: 'Xem danh sách các khoản phụ thu hiện có' },
          { title: 'Bấm "Thêm phụ thu"', description: 'Chọn loại: minibar, dịch vụ, hư hỏng' },
          { title: 'Nhập chi tiết', description: 'Chọn sản phẩm, số lượng, đơn giá' },
          { title: 'Lưu', description: 'Phụ thu sẽ tự động cộng vào bill khi check-out' },
        ],
      },
      {
        id: 'extend-booking',
        title: 'Gia hạn booking',
        description: 'Kéo dài thời gian lưu trú cho khách',
        icon: CalendarClock,
        navigateTo: '/bookings',
        steps: [
          { title: 'Tìm booking', description: 'Vào booking của khách cần gia hạn' },
          { title: 'Bấm "Gia hạn"', description: 'Chọn ngày check-out mới' },
          { title: 'Xác nhận giá', description: 'Hệ thống tính thêm chi phí cho số ngày gia hạn' },
          { title: 'Lưu', description: 'Xác nhận gia hạn — booking được cập nhật' },
        ],
      },
    ],
  },
  {
    roleId: 'manager',
    roleLabel: 'Quản lý',
    roleDescription: 'Hướng dẫn quản lý kho, chuẩn phòng, báo cáo và phân quyền nhân sự',
    guides: [
      {
        id: 'inventory-inbound',
        title: 'Nhập kho',
        description: 'Nhập hàng mới vào kho từ nhà cung cấp',
        icon: Warehouse,
        navigateTo: '/inventory/inbound',
        steps: [
          { title: 'Vào trang Nhập kho', description: 'Chọn "Kho" → "Nhập kho" từ menu' },
          { title: 'Bấm "Tạo phiếu nhập"', description: 'Chọn nhà cung cấp (nếu có)' },
          { title: 'Thêm sản phẩm', description: 'Chọn sản phẩm, nhập số lượng và đơn giá' },
          { title: 'Xác nhận', description: 'Kiểm tra lại và bấm "Tạo phiếu nhập"' },
        ],
        tips: [
          'Số lượng tồn kho sẽ tự động tăng sau khi phiếu nhập được tạo',
          'Có thể nhập nhiều sản phẩm trong cùng 1 phiếu',
        ],
      },
      {
        id: 'inventory-outbound',
        title: 'Xuất kho',
        description: 'Xuất hàng từ kho cho các mục đích khác nhau',
        icon: TruckIcon,
        navigateTo: '/inventory/outbound',
        steps: [
          { title: 'Vào trang Xuất kho', description: 'Chọn "Kho" → "Xuất kho"' },
          { title: 'Chọn loại xuất', description: 'Xuất sử dụng, xuất hỏng, xuất trả nhà cung cấp...' },
          { title: 'Thêm sản phẩm', description: 'Chọn sản phẩm và số lượng cần xuất' },
          { title: 'Xác nhận', description: 'Tạo phiếu xuất — tồn kho tự động giảm' },
        ],
      },
      {
        id: 'stock-audit',
        title: 'Kiểm kê kho',
        description: 'Kiểm tra và đối soát số lượng thực tế với hệ thống',
        icon: ClipboardList,
        navigateTo: '/inventory/stock-audit',
        steps: [
          { title: 'Vào trang Kiểm kê', description: 'Chọn "Kho" → "Kiểm kê"' },
          { title: 'Tạo đợt kiểm kê', description: 'Bấm "Tạo kiểm kê mới"' },
          { title: 'Nhập số thực tế', description: 'Nhập số lượng đếm được cho từng sản phẩm' },
          { title: 'Xem chênh lệch', description: 'Hệ thống tự tính chênh lệch giữa thực tế và sổ sách' },
          { title: 'Xác nhận điều chỉnh', description: 'Duyệt và cập nhật tồn kho theo thực tế' },
        ],
      },
      {
        id: 'room-standards',
        title: 'Thiết lập chuẩn phòng',
        description: 'Cấu hình danh sách đồ dùng tiêu chuẩn cho từng loại phòng',
        icon: LayoutGrid,
        navigateTo: '/rooms/standards',
        steps: [
          { title: 'Vào cài đặt chuẩn phòng', description: 'Chọn "Phòng" → "Chuẩn phòng"' },
          { title: 'Chọn loại phòng', description: 'Chọn loại phòng cần thiết lập (Standard, Deluxe, Suite...)' },
          { title: 'Thêm sản phẩm', description: 'Chọn đồ dùng và số lượng tiêu chuẩn cho loại phòng' },
          { title: 'Lưu', description: 'Chuẩn phòng sẽ được áp dụng khi kiểm tra phòng' },
        ],
        tips: [
          'Chuẩn phòng dùng để so sánh khi kiểm tra check-in/check-out',
          'Phân biệt đồ tiêu hao (nước, snack) và đồ lâu bền (khăn, ga)',
        ],
      },
      {
        id: 'view-reports',
        title: 'Xem báo cáo',
        description: 'Xem các báo cáo tổng hợp về kho, giặt là, tài chính',
        icon: BarChart3,
        navigateTo: '/reports',
        steps: [
          { title: 'Vào trang Báo cáo', description: 'Chọn "Báo cáo" từ menu' },
          { title: 'Chọn loại báo cáo', description: 'Kho, Giặt là, Tài chính, Vận hành, Bảo trì...' },
          { title: 'Chọn khoảng thời gian', description: 'Lọc theo ngày, tuần, tháng' },
          { title: 'Xuất báo cáo', description: 'Bấm "Xuất PDF" hoặc "Xuất Excel" để tải về' },
        ],
      },
      {
        id: 'manage-staff',
        title: 'Quản lý nhân sự',
        description: 'Thêm, sửa, phân quyền cho nhân viên',
        icon: Users,
        navigateTo: '/settings/users',
        steps: [
          { title: 'Vào Cài đặt → Nhân sự', description: 'Chọn "Cài đặt" → "Quản lý người dùng"' },
          { title: 'Thêm nhân viên', description: 'Bấm "Thêm người dùng", nhập email, tên, vai trò' },
          { title: 'Phân quyền', description: 'Chọn vai trò: Quản lý hoặc Nhân viên' },
          { title: 'Gán khách sạn', description: 'Chọn khách sạn mà nhân viên được quyền truy cập' },
        ],
        tips: [
          'Quản lý có thể tạo Quản lý khác hoặc Nhân viên',
          'Nhân viên chỉ xem được dữ liệu của khách sạn được gán',
        ],
      },
      {
        id: 'distribution-order',
        title: 'Tạo phiếu giao hàng',
        description: 'Tạo phiếu giao đồ dùng từ kho đến các phòng',
        icon: TruckIcon,
        navigateTo: '/inventory/distributions/new',
        steps: [
          { title: 'Vào trang Phiếu giao', description: 'Chọn "Kho" → "Phiếu giao hàng" → "Tạo mới"' },
          { title: 'Chọn phòng', description: 'Chọn các phòng cần giao hàng' },
          { title: 'Phân bổ sản phẩm', description: 'Chọn sản phẩm và số lượng cho từng phòng' },
          { title: 'Phân công nhân viên', description: 'Chọn nhân viên đi giao' },
          { title: 'Tạo phiếu', description: 'Bấm "Tạo phiếu" — nhân viên sẽ nhận thông báo' },
        ],
        tips: [
          'Dùng nút "Tự động phân bổ" để hệ thống tính số lượng theo chuẩn phòng',
          'Có thể tạo phiếu từ yêu cầu bổ sung để nhanh hơn',
        ],
      },
    ],
  },
  {
    roleId: 'owner',
    roleLabel: 'Chủ khách sạn',
    roleDescription: 'Hướng dẫn quản lý tổng quan, subscription, cấu hình hệ thống',
    guides: [
      {
        id: 'dashboard-overview',
        title: 'Xem Dashboard tổng quan',
        description: 'Nắm bắt tình hình hoạt động qua dashboard',
        icon: LayoutDashboard,
        navigateTo: '/dashboard',
        steps: [
          { title: 'Mở Dashboard', description: 'Dashboard là trang mặc định khi đăng nhập' },
          { title: 'Xem tổng quan', description: 'Xem số phòng trống, đang sử dụng, cần dọn' },
          { title: 'Xem thống kê', description: 'Biểu đồ doanh thu, công suất phòng, hoạt động' },
          { title: 'Chuyển khách sạn', description: 'Dùng bộ chọn khách sạn ở header để xem từng KS' },
        ],
      },
      {
        id: 'manage-subscription',
        title: 'Quản lý gói dịch vụ',
        description: 'Gia hạn, mua thêm phòng, thanh toán subscription',
        icon: CreditCardIcon,
        navigateTo: '/settings/subscription',
        steps: [
          { title: 'Vào Cài đặt → Gói dịch vụ', description: 'Chọn "Cài đặt" → "Gói dịch vụ"' },
          { title: 'Xem gói hiện tại', description: 'Xem số phòng, ngày hết hạn, trạng thái' },
          { title: 'Gia hạn', description: 'Bấm "Gia hạn", chọn thời hạn (3/6/12 tháng)' },
          { title: 'Mua thêm phòng', description: 'Bấm "Thêm phòng", nhập số lượng cần thêm' },
          { title: 'Thanh toán', description: 'Quét mã QR VietQR để thanh toán' },
        ],
        tips: [
          'Gia hạn dài hơn được giảm giá: 3 tháng -5%, 6 tháng -10%, 1 năm -15%',
          'Mua thêm phòng giữ nguyên ngày hết hạn, chỉ tăng số phòng',
        ],
      },
      {
        id: 'add-hotel',
        title: 'Thêm khách sạn mới',
        description: 'Tạo và cấu hình khách sạn mới trong hệ thống',
        icon: Building2,
        navigateTo: '/settings/hotels',
        steps: [
          { title: 'Vào Cài đặt → Khách sạn', description: 'Chọn "Cài đặt" → "Quản lý khách sạn"' },
          { title: 'Bấm "Thêm khách sạn"', description: 'Điền tên, địa chỉ, loại hình' },
          { title: 'Cấu hình số tầng và phòng', description: 'Nhập số tầng, tổng số phòng' },
          { title: 'Gán quản lý', description: 'Chọn người quản lý cho khách sạn mới' },
          { title: 'Lưu', description: 'Khách sạn mới sẽ xuất hiện trong bộ chọn' },
        ],
        tips: [
          'Số phòng thêm phải nằm trong quota của gói subscription',
          'Mỗi khách sạn có thể có quản lý riêng',
        ],
      },
      {
        id: 'system-settings',
        title: 'Cài đặt hệ thống',
        description: 'Cấu hình thông tin tổ chức, thông báo, bảo mật',
        icon: Settings,
        navigateTo: '/settings',
        steps: [
          { title: 'Vào trang Cài đặt', description: 'Chọn "Cài đặt" từ menu' },
          { title: 'Thông tin tổ chức', description: 'Cập nhật tên, logo, thông tin liên hệ' },
          { title: 'Cấu hình thông báo', description: 'Bật/tắt email, push notification cho từng sự kiện' },
          { title: 'Quản lý bảo mật', description: 'Xem nhật ký hoạt động, quản lý phiên đăng nhập' },
        ],
      },
      {
        id: 'manage-notifications',
        title: 'Quản lý thông báo',
        description: 'Cấu hình các loại thông báo cho hệ thống',
        icon: Bell,
        navigateTo: '/settings/notifications',
        steps: [
          { title: 'Vào Cài đặt → Thông báo', description: 'Chọn "Cài đặt" → "Thông báo"' },
          { title: 'Chọn loại thông báo', description: 'Email, Push notification, In-app' },
          { title: 'Cấu hình sự kiện', description: 'Chọn sự kiện nào cần gửi thông báo' },
          { title: 'Lưu cài đặt', description: 'Thông báo sẽ tự động gửi theo cấu hình' },
        ],
      },
    ],
  },
]
