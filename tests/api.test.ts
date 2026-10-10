import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, readJson, privateJson } from "../lib/api.ts";

const request = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://rentfits.test/api/listings", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });

test("same-origin JSON is accepted", async () => {
  assert.deepEqual(
    await readJson(
      request('{"rent":799}', { origin: "https://rentfits.test" }),
    ),
    { rent: 799 },
  );
});
test("cross-origin mutations are rejected", async () => {
  await assert.rejects(
    readJson(request("{}", { origin: "https://outside.test" })),
    (error: unknown) => error instanceof ApiError && error.status === 403,
  );
});
test("form and malformed JSON are rejected", async () => {
  await assert.rejects(
    readJson(request("{}", { "content-type": "text/plain" })),
    (error: unknown) => error instanceof ApiError && error.status === 415,
  );
  await assert.rejects(
    readJson(request("{")),
    (error: unknown) => error instanceof ApiError && error.status === 400,
  );
});
test("request size is measured in bytes", async () => {
  await assert.rejects(
    readJson(request(JSON.stringify({ note: "🌱".repeat(20) })), 40),
    (error: unknown) => error instanceof ApiError && error.status === 413,
  );
});
test("owner data is never publicly cached", () => {
  const response = privateJson({ ids: [] });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("vary") ?? "", /oai-authenticated-user-id/);
});
