export function ratioWidth(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.max(8, Math.round((value / total) * 100))}%`;
}