import "server-only";

export const ADMIN_SECRET_HEADER = "x-biasly-admin-secret";

function getAdminSecret(): string {
  const value = process.env.BIASLY_ADMIN_SECRET;
  if (!value) {
    throw new Error(
      "Missing required environment variable: BIASLY_ADMIN_SECRET",
    );
  }
  return value;
}

export class AdminAuthError extends Error {
  readonly status = 401;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AdminAuthError";
  }
}

/** Compares `x-biasly-admin-secret` to `BIASLY_ADMIN_SECRET`. Throws AdminAuthError on failure. */
export function assertAdminSecret(request: Request): void {
  const provided = request.headers.get(ADMIN_SECRET_HEADER);
  const expected = getAdminSecret();
  if (!provided || provided !== expected) {
    throw new AdminAuthError();
  }
}
