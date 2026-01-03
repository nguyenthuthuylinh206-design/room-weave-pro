/**
 * Booking Calculations Utility
 * Handles all pricing logic including surcharges, VAT, and service fees
 */

export interface PricingRules {
  // Standard times
  standardCheckinTime: string // "14:00"
  standardCheckoutTime: string // "12:00"
  
  // Early check-in surcharge (% of room price)
  earlyCheckin5_9: number // 50%
  earlyCheckin9_14: number // 30%
  
  // Late check-out surcharge (% of room price)
  lateCheckout12_15: number // 30%
  lateCheckout15_18: number // 50%
  lateCheckoutAfter18: number // 100%
  
  // Tax and fees
  vatRate: number // 8%
  serviceFeeRate: number // 5%
}

export const DEFAULT_PRICING_RULES: PricingRules = {
  standardCheckinTime: '14:00',
  standardCheckoutTime: '12:00',
  earlyCheckin5_9: 50,
  earlyCheckin9_14: 30,
  lateCheckout12_15: 30,
  lateCheckout15_18: 50,
  lateCheckoutAfter18: 100,
  vatRate: 8,
  serviceFeeRate: 5,
}

export interface BookingCostBreakdown {
  // Room charges
  roomPricePerNight: number
  nights: number
  roomTotal: number
  
  // Surcharges
  earlyCheckinCharge: number
  lateCheckoutCharge: number
  totalSurcharges: number
  
  // Services (from consumables)
  serviceCharges: number
  extraCharges: number
  
  // Subtotal (before tax)
  subtotal: number
  
  // Tax and fees
  vatRate: number
  vatAmount: number
  serviceFeeRate: number
  serviceFeeAmount: number
  
  // Grand total
  totalAmount: number
  
  // Payments
  depositAmount: number
  amountPaid: number
  remainingAmount: number
  
  // Status
  paymentStatus: 'pending' | 'partial' | 'paid'
}

/**
 * Parse time string to hours (e.g., "14:00" -> 14)
 */
export function parseTimeToHours(timeStr: string): number {
  const [hours] = timeStr.split(':').map(Number)
  return hours
}

/**
 * Calculate early check-in surcharge based on actual check-in time
 */
export function calculateEarlyCheckinCharge(
  actualCheckinTime: string,
  roomPrice: number,
  rules: PricingRules = DEFAULT_PRICING_RULES
): number {
  const hours = parseTimeToHours(actualCheckinTime)
  const standardHours = parseTimeToHours(rules.standardCheckinTime)
  
  // No surcharge if check-in is at or after standard time
  if (hours >= standardHours) {
    return 0
  }
  
  // Check-in from 5h-9h: 50% surcharge
  if (hours >= 5 && hours < 9) {
    return Math.round(roomPrice * rules.earlyCheckin5_9 / 100)
  }
  
  // Check-in from 9h-14h: 30% surcharge
  if (hours >= 9 && hours < standardHours) {
    return Math.round(roomPrice * rules.earlyCheckin9_14 / 100)
  }
  
  return 0
}

/**
 * Calculate late check-out surcharge based on actual check-out time
 */
export function calculateLateCheckoutCharge(
  actualCheckoutTime: string,
  roomPrice: number,
  rules: PricingRules = DEFAULT_PRICING_RULES
): number {
  const hours = parseTimeToHours(actualCheckoutTime)
  const standardHours = parseTimeToHours(rules.standardCheckoutTime)
  
  // No surcharge if check-out is at or before standard time
  if (hours <= standardHours) {
    return 0
  }
  
  // Check-out from 12h-15h: 30% surcharge
  if (hours > standardHours && hours <= 15) {
    return Math.round(roomPrice * rules.lateCheckout12_15 / 100)
  }
  
  // Check-out from 15h-18h: 50% surcharge
  if (hours > 15 && hours <= 18) {
    return Math.round(roomPrice * rules.lateCheckout15_18 / 100)
  }
  
  // Check-out after 18h: 100% surcharge (extra night)
  if (hours > 18) {
    return Math.round(roomPrice * rules.lateCheckoutAfter18 / 100)
  }
  
  return 0
}

/**
 * Calculate full booking cost breakdown
 */
export function calculateBookingCost(params: {
  roomPrice: number
  nights: number
  earlyCheckinCharge?: number
  lateCheckoutCharge?: number
  serviceCharges?: number
  extraCharges?: number
  vatRate?: number
  serviceFeeRate?: number
  depositAmount?: number
  amountPaid?: number
}): BookingCostBreakdown {
  const {
    roomPrice,
    nights,
    earlyCheckinCharge = 0,
    lateCheckoutCharge = 0,
    serviceCharges = 0,
    extraCharges = 0,
    vatRate = DEFAULT_PRICING_RULES.vatRate,
    serviceFeeRate = DEFAULT_PRICING_RULES.serviceFeeRate,
    depositAmount = 0,
    amountPaid = 0,
  } = params
  
  // Room total
  const roomTotal = roomPrice * Math.max(1, nights)
  
  // Total surcharges
  const totalSurcharges = earlyCheckinCharge + lateCheckoutCharge
  
  // Subtotal before tax
  const subtotal = roomTotal + totalSurcharges + serviceCharges + extraCharges
  
  // Calculate VAT and service fee
  const vatAmount = Math.round(subtotal * vatRate / 100)
  const serviceFeeAmount = Math.round(subtotal * serviceFeeRate / 100)
  
  // Grand total
  const totalAmount = subtotal + vatAmount + serviceFeeAmount
  
  // Remaining to pay (deposit is part of payment)
  const totalPaid = depositAmount + amountPaid
  const remainingAmount = Math.max(0, totalAmount - totalPaid)
  
  // Payment status
  let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending'
  if (totalPaid >= totalAmount) {
    paymentStatus = 'paid'
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
  }
  
  return {
    roomPricePerNight: roomPrice,
    nights,
    roomTotal,
    earlyCheckinCharge,
    lateCheckoutCharge,
    totalSurcharges,
    serviceCharges,
    extraCharges,
    subtotal,
    vatRate,
    vatAmount,
    serviceFeeRate,
    serviceFeeAmount,
    totalAmount,
    depositAmount,
    amountPaid,
    remainingAmount,
    paymentStatus,
  }
}

/**
 * Get early check-in surcharge description
 */
export function getEarlyCheckinDescription(timeStr: string, rules: PricingRules = DEFAULT_PRICING_RULES): string | null {
  const hours = parseTimeToHours(timeStr)
  const standardHours = parseTimeToHours(rules.standardCheckinTime)
  
  if (hours >= standardHours) return null
  
  if (hours >= 5 && hours < 9) {
    return `Check-in sớm (${timeStr} - ${rules.earlyCheckin5_9}%)`
  }
  
  if (hours >= 9 && hours < standardHours) {
    return `Check-in sớm (${timeStr} - ${rules.earlyCheckin9_14}%)`
  }
  
  return null
}

/**
 * Get late check-out surcharge description
 */
export function getLateCheckoutDescription(timeStr: string, rules: PricingRules = DEFAULT_PRICING_RULES): string | null {
  const hours = parseTimeToHours(timeStr)
  const standardHours = parseTimeToHours(rules.standardCheckoutTime)
  
  if (hours <= standardHours) return null
  
  if (hours > standardHours && hours <= 15) {
    return `Check-out trễ (${timeStr} - ${rules.lateCheckout12_15}%)`
  }
  
  if (hours > 15 && hours <= 18) {
    return `Check-out trễ (${timeStr} - ${rules.lateCheckout15_18}%)`
  }
  
  if (hours > 18) {
    return `Check-out trễ (${timeStr} - ${rules.lateCheckoutAfter18}% = 1 đêm)`
  }
  
  return null
}
