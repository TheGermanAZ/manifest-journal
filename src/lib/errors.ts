/** Extract a useful error message from any thrown value. */
export function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
