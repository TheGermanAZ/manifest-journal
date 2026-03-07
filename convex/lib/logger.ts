// Structured logger for Convex backend functions, powered by pino.
// Uses pino's browser mode to route through console.* methods,
// which Convex captures in dashboard logs.
//
// Every log line includes an `opId` — a short unique ID generated per
// createLogger() call. This lets you grep for a single operation across
// all its log lines. For cross-operation tracing, use entity IDs
// (entryId, userId) which are passed as baseCtx.

import pino from "pino";

type LogContext = Record<string, unknown>;

const rootLogger = pino({
  browser: { asObject: true },
  level: "debug",
});

let counter = 0;

/** Generate a short, unique-enough operation ID. */
function generateOpId(): string {
  // Base36 timestamp (last 6 chars) + counter for uniqueness within the same ms
  const ts = Date.now().toString(36).slice(-6);
  const seq = (counter++).toString(36);
  return `${ts}-${seq}`;
}

/** Create a logger scoped to an operation (function name).
 *  Every log line will include `op` and `opId` for tracing. */
export function createLogger(op: string, baseCtx?: LogContext) {
  const opId = generateOpId();
  const opStart = Date.now();
  const child = rootLogger.child({ op, opId, ...baseCtx });

  return {
    /** The operation ID for this logger instance. */
    opId,

    debug: (msg: string, ctx?: LogContext) => child.debug(ctx ?? {}, msg),
    info: (msg: string, ctx?: LogContext) => child.info(ctx ?? {}, msg),
    warn: (msg: string, ctx?: LogContext) => child.warn(ctx ?? {}, msg),
    error: (msg: string, ctx?: LogContext) => child.error(ctx ?? {}, msg),

    /** Time an async operation. Logs info on success, error on failure. */
    async time<T>(label: string, fn: () => Promise<T>, ctx?: LogContext): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        child.info({ ...ctx, durationMs: Date.now() - start }, `${label} completed`);
        return result;
      } catch (err) {
        child.error(
          {
            ...ctx,
            durationMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          },
          `${label} failed`,
        );
        throw err;
      }
    },

    /** Log operation completion with total duration since logger creation. */
    done(ctx?: LogContext) {
      child.info({ ...ctx, totalMs: Date.now() - opStart }, "operation complete");
    },
  };
}
