export function utcStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`)
}

export function utcNextDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1))
}
