/** Max URLs per PostgREST `.in()` filter (AGENTS §9). */
export const URL_EXISTENCE_CHUNK_SIZE = 15;

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("chunk size must be positive");
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export class SupabaseQueryError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "SupabaseQueryError";
    this.code = code;
  }
}

export function throwOnError(
  error: { message: string; code?: string } | null,
  context: string,
): void {
  if (error) {
    throw new SupabaseQueryError(`${context}: ${error.message}`, error.code);
  }
}

export function requireData<T>(data: T | null, context: string): T {
  if (data == null) {
    throw new SupabaseQueryError(`${context}: expected a row but got null`);
  }
  return data;
}
