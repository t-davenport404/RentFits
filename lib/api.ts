/** Mutations accept only same-origin JSON and bounded bodies. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readJson(
  request: Request,
  maxBytes = 16_384,
): Promise<unknown> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiError(403, "This request must come from RentFits.");
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new ApiError(415, "Send listing details as JSON.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "The request is empty.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, "These listing details are too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "These listing details are not valid JSON.");
  }
}

export function privateJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie, oai-authenticated-user-id",
    },
  });
}

export function routeError(error: unknown) {
  if (error instanceof ApiError)
    return privateJson({ error: error.message }, error.status);
  // Never expose database, credential, or provider diagnostics to visitors.
  console.error(
    "RentFits request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return privateJson(
    { error: "We couldn't save or load your rentals. Please try again." },
    503,
  );
}
