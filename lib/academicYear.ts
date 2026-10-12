/** Academic years run August 1 through July 31. */
export function academicYearStart(now: number) {
  const date = new Date(now);
  const year = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(year, 7, 1).getTime();
}

export function academicYearEnd(start: number) {
  return new Date(new Date(start).getFullYear() + 1, 7, 1).getTime();
}

/** Officer terms end with the academic year, on July 31. */
export function termEnd(now: number) {
  return academicYearEnd(academicYearStart(now)) - 1;
}

export function academicYearLabel(start: number) {
  const year = new Date(start).getFullYear();
  return `${year}–${String(year + 1).slice(2)}`;
}

/** The class that graduates at the end of the current academic year. */
export function graduatingClass(now: number) {
  return new Date(academicYearStart(now)).getFullYear() + 1;
}
