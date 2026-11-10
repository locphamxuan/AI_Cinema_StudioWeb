const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DATE_TIME = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: TIME_ZONE });
const DATE = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TIME_ZONE });
/** "YYYY-MM-DD" of a moment in Vietnam time. */
const DAY_KEY = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE });
const NUMBER = new Intl.NumberFormat('vi-VN');

const parse = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? DATE_TIME.format(date) : '-';
}

/** A calendar date of the API (`@db.Date`, sent as midnight UTC = 7:00 in Vietnam) keeps its day. */
export function formatDate(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? DATE.format(date) : '-';
}

/** 170000000 → "170.000.000 VND" */
export function formatVnd(amount: number | null | undefined): string {
  return amount === null || amount === undefined ? 'Chưa có giá' : `${NUMBER.format(amount)} VND`;
}

/** 125 → "2 phút 5 giây" */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (!minutes) return `${rest} giây`;
  return rest ? `${minutes} phút ${rest} giây` : `${minutes} phút`;
}

/** Whole days from today until a deadline (negative once it passed), both counted in Vietnam time. */
export function daysUntil(iso: string | null | undefined, now = new Date()): number | null {
  const date = parse(iso);
  if (!date) return null;
  const day = (d: Date) => Date.parse(`${DAY_KEY.format(d)}T00:00:00Z`);
  return Math.round((day(date) - day(now)) / 86_400_000);
}
