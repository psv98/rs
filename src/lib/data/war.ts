/** Full months between the monitoring start and the data date, grouped by calendar year. */
export function warMonths(start: string, end: string): Array<{ year: number; months: number }> {
  const [sy, sm, sd] = start.split("-").map(Number) as [number, number, number];
  const [ey, em, ed] = end.split("-").map(Number) as [number, number, number];
  let total = (ey - sy) * 12 + (em - sm) - (ed < sd ? 1 : 0);
  if (total < 1) total = 1;
  const groups: Array<{ year: number; months: number }> = [];
  for (let k = 1; k <= total; k++) {
    const m = sm - 1 + k; // 0-based month index from Jan of start year
    const year = sy + Math.floor(m / 12);
    const last = groups.at(-1);
    if (last && last.year === year) last.months++;
    else groups.push({ year, months: 1 });
  }
  return groups;
}

