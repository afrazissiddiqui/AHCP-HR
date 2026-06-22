const ANGULAR_HTTP_FAILURE = /^Http failure response for /i;

function isAngularHttpFailureMessage(message: string): boolean {
  return ANGULAR_HTTP_FAILURE.test(message);
}

function messageFromHttpStatus(status: number, fallback: string): string {
  switch (status) {
    case 0:
      return 'Unable to connect to the server. Please check your network and try again.';
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Invalid credentials. Please check your email and password.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 408:
      return 'The request timed out. Please try again.';
    case 422:
      return fallback;
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'The server is temporarily unavailable. Please try again later.';
    default:
      if (status >= 500) {
        return 'Server error. Please try again later.';
      }
      return fallback;
  }
}

/** Formats HTTP error bodies (e.g. Laravel 422 validation) for display in alerts. */
export function formatApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    error?: Record<string, unknown> | string;
    message?: string;
    status?: number;
  };
  const body = err?.error;
  const status = typeof err?.status === 'number' ? err.status : undefined;

  if (body && typeof body === 'object') {
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
  }

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (trimmed && !isAngularHttpFailureMessage(trimmed)) {
      return trimmed;
    }
  }

  const rawMessage = err?.message?.trim();
  if (rawMessage && !isAngularHttpFailureMessage(rawMessage)) {
    return rawMessage;
  }

  if (status !== undefined) {
    return messageFromHttpStatus(status, fallback);
  }

  return fallback;
}
