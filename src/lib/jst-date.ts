const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function todayJstDateKey(now = new Date()) {
  return toDateKey(new Date(now.getTime() + JST_OFFSET_MS));
}

export function nextDateKeyForWeekday(startDateKey: string, dayOfWeek: number, weekOffset = 0) {
  const date = toUtcDate(startDateKey);
  const diff = (dayOfWeek - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + diff + weekOffset * 7);
  return toDateKey(date);
}

export function jstDateTime(dateKey: string, time = "00:00") {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${dateKey}T${normalizedTime}+09:00`);
}
