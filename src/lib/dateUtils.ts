export function isDateClosed(dailyClosings: { closing_date: string }[], date: string): boolean {
  return dailyClosings.some(c => {
    const d = new Date(c.closing_date).toISOString().split('T')[0];
    return d === date;
  });
}
