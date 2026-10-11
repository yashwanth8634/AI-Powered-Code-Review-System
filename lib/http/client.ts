export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiClientError(
      "Could not reach the server. Check your connection and try again.",
      0,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}.`;
    throw new ApiClientError(message, response.status, payload?.details);
  }

  return payload as T;
}
