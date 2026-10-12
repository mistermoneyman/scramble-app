const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export const formatDay = (ts: number) => dayFormat.format(ts);
export const formatTime = (ts: number) => timeFormat.format(ts);
export const formatDateTime = (ts: number) => `${formatDay(ts)} · ${formatTime(ts)}`;

export function formatRelative(ts: number, now: number) {
  const diff = now - ts;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return shortDateFormat.format(ts);
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return 'now';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function firstName(name: string) {
  return name.split(' ')[0];
}
