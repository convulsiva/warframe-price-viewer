import { currentLanguage, translate } from "../lib/i18n";

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
  const language = currentLanguage();
  if (!isApiError(error)) return translate(language, "apiUnexpected");
  if (error.kind === "rate-limit") return translate(language, "apiRateLimit");
  if (error.kind === "connection-limit") return translate(language, "apiConnections");
  if (error.kind === "network") return translate(language, "apiNetwork");
  if (error.kind === "timeout") return translate(language, "apiTimeout");
  if (error.kind === "not-found") return translate(language, "apiNotFound");
  if (error.kind === "validation") return translate(language, "apiValidation");
  if (error.kind === "server") return translate(language, "apiServer");
  if (error.kind === "forbidden") return translate(language, "apiForbidden");
  return error.message;
}
