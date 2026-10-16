const DATE_TIME = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const NUMBER = new Intl.NumberFormat('vi-VN');

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : DATE_TIME.format(date);
}

export const formatNumber = (n: number | null | undefined) => (n === null || n === undefined ? '-' : NUMBER.format(n));

/** 125 → "2:05" */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
