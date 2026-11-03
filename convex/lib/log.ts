type Level = "info" | "warn" | "error";

// One JSON object per line, so a log drain such as Datadog can index the
// fields. Pass ids and reasons here, never names or email addresses.
export function logEvent(
  level: Level,
  event: string,
  fields: Record<string, unknown> = {},
) {
  const line = JSON.stringify({ level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
