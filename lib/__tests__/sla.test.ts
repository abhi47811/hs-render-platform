import { getSlaStatus, getSlaHoursRemaining, formatSlaDisplay, calculateSlaDeadline } from '@/lib/sla'

describe('getSlaHoursRemaining', () => {
  it('returns positive hours when deadline is in the future', () => {
    const future = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
    expect(getSlaHoursRemaining(future)).toBeCloseTo(25, 0)
  })

  it('returns negative hours when deadline has passed', () => {
    const past = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    expect(getSlaHoursRemaining(past)).toBeCloseTo(-5, 0)
  })

  it('returns approximately 0 for a deadline right now', () => {
    const now = new Date().toISOString()
    expect(Math.abs(getSlaHoursRemaining(now))).toBeLessThan(0.01)
  })
})

describe('getSlaStatus', () => {
  it('returns green when more than 24 hours remain', () => {
    const future = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
    expect(getSlaStatus(future)).toBe('green')
  })

  it('returns amber when 18 hours remain', () => {
    const future = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString()
    expect(getSlaStatus(future)).toBe('amber')
  })

  it('returns red when 6 hours remain', () => {
    const future = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    expect(getSlaStatus(future)).toBe('red')
  })

  it('returns breached when deadline has passed', () => {
    const past = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    expect(getSlaStatus(past)).toBe('breached')
  })
})

describe('formatSlaDisplay', () => {
  it('formats hours and minutes correctly for 25h 30m remaining', () => {
    const future = new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString()
    expect(formatSlaDisplay(future)).toBe('25h 30m')
  })

  it('formats correctly for exactly 12 hours', () => {
    const future = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    expect(formatSlaDisplay(future)).toBe('12h 0m')
  })

  it('shows LATE for breached SLA', () => {
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatSlaDisplay(past)).toBe('LATE')
  })
})

describe('calculateSlaDeadline', () => {
  it('returns a deadline 72 hours from the given start time', () => {
    const start = new Date('2026-04-10T10:00:00Z')
    const deadline = calculateSlaDeadline(start)
    expect(deadline).toBe('2026-04-13T10:00:00.000Z')
  })

  it('returns a deadline approximately 72 hours from now when no arg given', () => {
    const before = Date.now()
    const deadline = calculateSlaDeadline()
    const deadlineMs = new Date(deadline).getTime()
    const expectedMs = before + 72 * 60 * 60 * 1000
    expect(Math.abs(deadlineMs - expectedMs)).toBeLessThan(100)
  })
})
