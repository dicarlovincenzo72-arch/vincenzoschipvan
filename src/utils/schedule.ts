type ScheduledDay = { date: string; name: string; stops: string[][] };

export function londonDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function scheduleState(days: ScheduledDay[], now = new Date()) {
  const today = londonDate(now);
  const index = days.findIndex(day => day.date >= today && day.stops.length > 0);
  return { index, today, isToday: index >= 0 && days[index].date === today };
}

// Search the published venue/address, rather than inventing a precise parking pin.
export function stopMapUrl(label: string): string {
  const venue = label.split(' · ')[0].replace('Outside our base, ', '');
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue + ', Scotland');
}
