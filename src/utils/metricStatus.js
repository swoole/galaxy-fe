export function latencyTypeFromMilliseconds (value) {
  if (value === null || value === undefined || value === '') return ''
  const milliseconds = Number(value)
  if (!Number.isFinite(milliseconds)) return ''
  if (milliseconds < 200) return 'success'
  if (milliseconds <= 500) return 'warning'
  return 'danger'
}

export function latencyTypeFromSeconds (value) {
  if (value === null || value === undefined || value === '') return ''
  return latencyTypeFromMilliseconds(Number(value) * 1000)
}
