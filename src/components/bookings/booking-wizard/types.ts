import { AvailableRoom } from '@/hooks/useAvailableRooms'

export interface SelectedRoomWithPrice extends AvailableRoom {
  customPrice: number
}

export interface BookingFormState {
  // Step 1: Dates & Times
  checkInDate: Date | undefined
  checkOutDate: Date | undefined
  checkInTime: string
  checkOutTime: string
  
  // Step 2: Rooms
  selectedRooms: SelectedRoomWithPrice[]
  
  // Step 3: Guest Info
  guestName: string
  guestPhone: string
  guestEmail: string
  guestCount: number
  bookingSource: string
  bookingReference: string
  notes: string
  
  // Step 4: Payment
  includeVat: boolean
  vatRate: number
  includeServiceFee: boolean
  serviceFeeRate: number
  depositAmount: number
  otaPaymentType: string
  otaPaidAmount: number
  otaCommissionRate: number
}

export interface BookingFormComputed {
  nights: number
  totalRoomPrice: number
  subtotal: number
  vatAmount: number
  serviceFeeAmount: number
  estimatedTotal: number
  otaCommissionAmount: number
  netRevenue: number
  remainingAmount: number
  isOtaSource: boolean
}

export interface StepValidation {
  isStep1Valid: boolean
  isStep2Valid: boolean
  isStep3Valid: boolean
  isStep4Valid: boolean
}

export type WizardStep = 1 | 2 | 3 | 4 | 5

export interface WizardStepInfo {
  step: WizardStep
  title: string
  shortTitle: string
}

export const WIZARD_STEPS: WizardStepInfo[] = [
  { step: 1, title: 'Ngày & Giờ', shortTitle: 'Ngày giờ' },
  { step: 2, title: 'Chọn phòng', shortTitle: 'Phòng' },
  { step: 3, title: 'Thông tin khách', shortTitle: 'Khách' },
  { step: 4, title: 'Thanh toán', shortTitle: 'TT' },
  { step: 5, title: 'Xác nhận', shortTitle: 'XN' },
]
