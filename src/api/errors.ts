export type ApiErrorKind =
  | "network"
  | "timeout"
  | "rate-limit"
  | "connection-limit"
  | "not-found"
  | "forbidden"
  | "server"
  | "validation"
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly details?: unknown;

  constructor(kind: ApiErrorKind, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function messageForError(error: unknown): string {
  if (!isApiError(error)) return "Unexpected error. Please try again.";
  if (error.kind === "rate-limit") return "Warframe.market rate limit reached. Wait a moment before refreshing.";
  if (error.kind === "connection-limit") return "Too many API connections. The cached data remains visible if available.";
  if (error.kind === "network") return "Network error. Check your connection or try again later.";
  if (error.kind === "timeout") return "The API request timed out.";
  if (error.kind === "not-found") return "The item or endpoint was not found.";
  if (error.kind === "validation") return "The API returned data in an unexpected shape.";
  if (error.kind === "server") return "Warframe.market API is unavailable right now.";
  if (error.kind === "forbidden") return "The API rejected this request.";
  return error.message;
}
