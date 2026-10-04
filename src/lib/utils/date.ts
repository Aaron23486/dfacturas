export function formatDate(
  value: string | null | undefined
): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "es-CR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(new Date(value));
}

export function formatDateTime(
  value: string | null | undefined
): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "es-CR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  ).format(new Date(value));
}

export function formatToday(): string {
  return new Intl.DateTimeFormat(
    "es-CR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(new Date());
}

export function durationMinutes(
  start: string | null,
  end: string | null
): number | null {
  if (!start || !end) {
    return null;
  }

  const diff =
    new Date(end).getTime() -
    new Date(start).getTime();

  return Math.max(
    0,
    Math.round(diff / 60000)
  );
}

export function formatDuration(
  start: string | null,
  end: string | null
): string {
  const minutes = durationMinutes(
    start,
    end
  );

  if (minutes === null) {
    return "-";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60
  );
  const remaining = minutes % 60;

  return `${hours}h ${remaining}m`;
}
