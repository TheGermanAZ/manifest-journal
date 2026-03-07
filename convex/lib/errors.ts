// Typed error classes for the Convex backend.
// These carry semantic meaning so callers (and logs) can distinguish
// "user not authenticated" from "entry too long" from "AI provider down."

/** User is not authenticated or their app account doesn't exist yet. */
export class AuthError extends Error {
  readonly code = "AUTH_ERROR" as const;
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthError";
  }
}

/** Requested resource doesn't exist or isn't owned by the caller. */
export class NotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  constructor(resource: string, id?: string) {
    super(id ? `${resource} not found: ${id}` : `${resource} not found`);
    this.name = "NotFoundError";
  }
}

/** Input failed validation (too long, out of range, etc). */
export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR" as const;
  readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

/** Operation conflicts with current state (e.g. already on a path). */
export class ConflictError extends Error {
  readonly code = "CONFLICT" as const;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** External AI provider failed. Wraps the upstream error with context. */
export class AIError extends Error {
  readonly code = "AI_ERROR" as const;
  readonly provider: string;
  readonly operation: string;
  constructor(operation: string, cause: unknown, provider = "openrouter") {
    const upstream = cause instanceof Error ? cause.message : String(cause);
    super(`AI ${operation} failed: ${upstream}`);
    this.name = "AIError";
    this.provider = provider;
    this.operation = operation;
    this.cause = cause;
  }
}

/** Extract a useful error message from any thrown value. */
export function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
