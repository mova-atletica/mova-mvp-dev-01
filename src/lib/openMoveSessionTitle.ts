/** Default distinguishable title when the user skips naming a Studio session. */
export function defaultOpenMoveSessionTitle(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `Open Move · ${formatted}`;
}
