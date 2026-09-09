import { latencyTypeFromMilliseconds, latencyTypeFromSeconds } from '@/utils/metricStatus'

describe('metricStatus', () => {
  test.each([
    [0, 'success'],
    [199.99, 'success'],
    [200, 'warning'],
    [500, 'warning'],
    [500.01, 'danger']
  ])('maps %s milliseconds to %s', (value, expected) => {
    expect(latencyTypeFromMilliseconds(value)).toBe(expected)
  })

  test('maps seconds using the same thresholds', () => {
    expect(latencyTypeFromSeconds(0.199)).toBe('success')
    expect(latencyTypeFromSeconds(0.2)).toBe('warning')
    expect(latencyTypeFromSeconds(0.501)).toBe('danger')
  })

  test('does not color missing or invalid values', () => {
    expect(latencyTypeFromMilliseconds(null)).toBe('')
    expect(latencyTypeFromMilliseconds('invalid')).toBe('')
  })
})
