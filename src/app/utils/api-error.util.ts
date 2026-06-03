/** Formats HTTP error bodies (e.g. Laravel 422 validation) for display in alerts. */
export function formatApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as { error?: Record<string, unknown>; message?: string };
  const body = err?.error;

  if (!body || typeof body !== 'object') {
    return err?.message?.trim() || fallback;
  }

  const errors = body['errors'];
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const lines = Object.entries(errors as Record<string, unknown>).flatMap(([field, msgs]) => {
      const list = Array.isArray(msgs) ? msgs : [msgs];
      return list
        .map((msg) => String(msg).trim())
        .filter(Boolean)
        .map((msg) => `${field.replace(/_/g, ' ')}: ${msg}`);
    });
    if (lines.length > 0) {
      return lines.join('\n');
    }
  }

  const message = body['message'];
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  return fallback;
}
