import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SlaStatus } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SLA_STATUS_COLORS: Record<SlaStatus, string> = {
  green: 'text-green-700 bg-green-50 border-green-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red: 'text-red-700 bg-red-50 border-red-200',
  breached: 'text-gray-500 bg-gray-50 border-gray-200 line-through',
}

export const SLA_DOT_COLORS: Record<SlaStatus, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  breached: 'bg-gray-400',
}

export const BUDGET_LABELS: Record<string, string> = {
  economy: 'Economy (< ₹5L)',
  standard: 'Standard (₹5–12L)',
  premium: 'Premium (₹12–25L)',
  luxury: 'Luxury (₹25L+)',
}

export const OCCUPANT_ICONS: Record<string, string> = {
  'Single Professional': '👤',
  'Young Couple': '👫',
  'Family with Children': '👨‍👩‍👧',
  'Multi-Generational': '👨‍👩‍👧‍👦',
  'Elderly': '🧓',
  'Corporate': '🏢',
}
