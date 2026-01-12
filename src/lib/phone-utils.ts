/**
 * Chuyển số điện thoại VN sang format quốc tế cho Telegram
 * 0383792864 → +84383792864
 * 84383792864 → +84383792864
 * +84383792864 → +84383792864
 */
export function formatPhoneForTelegram(phone: string): string | null {
  if (!phone) return null
  
  // Loại bỏ ký tự không phải số và dấu +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Nếu đã có +84
  if (cleaned.startsWith('+84')) {
    return cleaned
  }
  
  // Nếu bắt đầu bằng 84 (không có +)
  if (cleaned.startsWith('84') && cleaned.length >= 11) {
    return '+' + cleaned
  }
  
  // Nếu bắt đầu bằng 0 (format VN local)
  if (cleaned.startsWith('0')) {
    return '+84' + cleaned.slice(1)
  }
  
  // Trường hợp khác, thử thêm +84 nếu đủ 9 số
  if (cleaned.length === 9) {
    return '+84' + cleaned
  }
  
  return null
}

/**
 * Tạo Telegram deep link từ số điện thoại
 * Dùng tg:// protocol để mở app trực tiếp
 */
export function getTelegramPhoneLink(phone: string): string | null {
  const formatted = formatPhoneForTelegram(phone)
  if (!formatted) return null
  
  // Loại bỏ dấu + để dùng trong tg:// protocol
  const phoneWithoutPlus = formatted.replace('+', '')
  return `tg://resolve?phone=${phoneWithoutPlus}`
}
