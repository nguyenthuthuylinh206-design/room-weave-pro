// Room-based pricing configuration
export const PRICE_PER_ROOM_DAILY = 1000; // 1,000đ/room/day
export const MIN_SUBSCRIPTION_DAYS = 30;

// Duration options with discounts
export const DURATION_OPTIONS = [
  { days: 30, label: '1 tháng', labelEn: '1 month', discount: 0 },
  { days: 90, label: '3 tháng', labelEn: '3 months', discount: 5 },
  { days: 180, label: '6 tháng', labelEn: '6 months', discount: 10 },
  { days: 365, label: '1 năm', labelEn: '1 year', discount: 15 },
] as const;

export type DurationOption = (typeof DURATION_OPTIONS)[number];

export interface PricingCalculation {
  basePrice: number;
  discount: number;
  discountPercent: number;
  finalPrice: number;
  pricePerDay: number;
  pricePerMonth: number;
  rooms: number;
  days: number;
}

/**
 * Calculate subscription price based on rooms and duration
 */
export function calculateSubscriptionPrice(
  rooms: number,
  days: number
): PricingCalculation {
  const effectiveDays = Math.max(days, MIN_SUBSCRIPTION_DAYS);
  const basePrice = rooms * PRICE_PER_ROOM_DAILY * effectiveDays;

  const option = DURATION_OPTIONS.find((o) => o.days === days);
  const discountPercent = option?.discount || 0;
  const discount = Math.round(basePrice * (discountPercent / 100));
  const finalPrice = basePrice - discount;

  return {
    basePrice,
    discount,
    discountPercent,
    finalPrice,
    pricePerDay: effectiveDays > 0 ? Math.round(finalPrice / effectiveDays) : 0,
    pricePerMonth:
      effectiveDays > 0 ? Math.round((finalPrice / effectiveDays) * 30) : 0,
    rooms,
    days: effectiveDays,
  };
}

/**
 * Format currency in Vietnamese format
 */
export function formatVNCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

/**
 * Get duration option by days
 */
export function getDurationOption(days: number): DurationOption | undefined {
  return DURATION_OPTIONS.find((o) => o.days === days);
}

/**
 * Calculate end date from start date and duration
 */
export function calculateEndDate(startDate: Date, durationDays: number): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  return endDate;
}

/**
 * Calculate remaining days from end date
 */
export function calculateRemainingDays(endDate: Date | string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
