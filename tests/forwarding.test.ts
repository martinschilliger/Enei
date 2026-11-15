import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { env } from "../app/utils/env";
import { catchAll } from "../app/route-catchall";

// `env` is a plain singleton object whose properties are writable. We reset
// and set them directly per test, and stub the global `fetch` so no real
// network request is ever made.
function setEnv(overrides: Record<string, unknown>) {
  for (const key of Object.keys(env)) delete (env as Record<string, unknown>)[key];
  Object.assign(env, overrides);
}

const originalFetch = globalThis.fetch;

// Bun's `fetch` carries extra properties (e.g. `preconnect`), so a plain
// function stub is not assignable to `typeof fetch`. This helper casts the
// handler so the assignment type-checks.
function stubFetch(handler: (input: Request) => Promise<Response>) {
  globalThis.fetch = handler as typeof fetch;
}

beforeEach(() => setEnv({}));
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("request forwarding", () => {
  test("mirrors the request back when no destination is set", async () => {
    const res = await catchAll(
      new Request("http://localhost:42144/api/incidents/42", {
        method: "POST",
        body: '{"clientName":"ELSE42D17"}',
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      method: string;
      url: string;
      body: string;
    };
    expect(body.method).toBe("POST");
    expect(body.url).toBe("/api/incidents/42");
    expect(body.body).toBe('{"clientName":"ELSE42D17"}');
  });

  test("answers CORS preflight with 204 when auto-accept is enabled", async () => {
    setEnv({
      ENEI_DESTINATION: "https://postman-echo.com",
      ENEI_CORS_AUTOACCEPT: true,
    });

    const res = await catchAll(
      new Request("https://localhost:42144/api/incidents", {
        method: "OPTIONS",
      }),
    );

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("forwards OPTIONS when CORS auto-accept is disabled", async () => {
    setEnv({ ENEI_DESTINATION: "https://postman-echo.com" });

    let fetchCalled = false;
    stubFetch(async (input: Request) => {
      fetchCalled = true;
      expect(input.method).toBe("OPTIONS");
      return new Response("preflight ok", { status: 200 });
    });

    const res = await catchAll(
      new Request("https://localhost:42144/api/incidents", {
        method: "OPTIONS",
      }),
    );

    expect(fetchCalled).toBe(true);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("preflight ok");
  });

  test("forwards the request to the destination", async () => {
    setEnv({ ENEI_DESTINATION: "https://postman-echo.com" });

    stubFetch(async (input: Request) => {
      expect(input.url).toBe("https://postman-echo.com/api/incidents/42");
      expect(input.method).toBe("GET");
      return new Response("hello from destination", { status: 200 });
    });

    const res = await catchAll(
      new Request("https://localhost:42144/api/incidents/42"),
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello from destination");
  });

  test("sets the host header to the destination host", async () => {
    setEnv({ ENEI_DESTINATION: "https://postman-echo.com" });

    let fetchCalled = false;
    stubFetch(async (input: Request) => {
      fetchCalled = true;
      expect(input.headers.get("host")).toBe("postman-echo.com");
      return new Response("ok", { status: 200 });
    });

    await catchAll(new Request("https://localhost:42144/api/incidents"));

    expect(fetchCalled).toBe(true);
  });

  test("forwards the request body and method", async () => {
    setEnv({ ENEI_DESTINATION: "https://postman-echo.com" });

    let fetchCalled = false;
    stubFetch(async (input: Request) => {
      fetchCalled = true;
      expect(input.method).toBe("PUT");
      expect(await input.text()).toBe('{"clientName":"ELSE42D17"}');
      return new Response("ok", { status: 200 });
    });

    const res = await catchAll(
      new Request("https://localhost:42144/api/incidents/42", {
        method: "PUT",
        body: '{"clientName":"ELSE42D17"}',
      }),
    );

    expect(fetchCalled).toBe(true);
    expect(res.status).toBe(200);
  });

  test("injects custom forward headers", async () => {
    setEnv({
      ENEI_DESTINATION: "https://postman-echo.com",
      ENEI_FORWARD_CUSTOM_HEADERS: { "x-api-key": "token-42" },
    });

    let fetchCalled = false;
    stubFetch(async (input: Request) => {
      fetchCalled = true;
      expect(input.headers.get("x-api-key")).toBe("token-42");
      return new Response("ok", { status: 200 });
    });

    await catchAll(new Request("https://localhost:42144/api/incidents"));

    expect(fetchCalled).toBe(true);
  });

  test("replaces the request body via regex", async () => {
    setEnv({
      ENEI_DESTINATION: "https://postman-echo.com",
      ENEI_FORWARD_BODY_REGEX: /"type":1/,
      ENEI_FORWARD_BODY_REPLACEMENT: '"type":2',
    });

    let fetchCalled = false;
    stubFetch(async (input: Request) => {
      fetchCalled = true;
      expect(await input.text()).toBe('{"type":2,"text":"DISPO"}');
      return new Response("ok", { status: 200 });
    });

    await catchAll(
      new Request("https://localhost:42144/api/incidents", {
        method: "POST",
        body: '{"type":1,"text":"DISPO"}',
      }),
    );

    expect(fetchCalled).toBe(true);
  });

  test("replaces the response body via regex", async () => {
    setEnv({
      ENEI_DESTINATION: "https://postman-echo.com",
      ENEI_BACKWARD_BODY_REGEX: /"foo":"(.+)"/,
      ENEI_BACKWARD_BODY_REPLACEMENT: '"bar":"$1"',
    });

    stubFetch(async () => new Response('{"foo":"hello"}', { status: 200 }));

    const res = await catchAll(
      new Request("https://localhost:42144/api/incidents"),
    );

    expect(await res.text()).toBe('{"bar":"hello"}');
  });

  test("injects custom backward headers into the response", async () => {
    setEnv({
      ENEI_DESTINATION: "https://postman-echo.com",
      ENEI_BACKWARD_CUSTOM_HEADERS: { "x-trace-id": "abc-123" },
    });

    stubFetch(async () => new Response("ok", { status: 200 }));

    const res = await catchAll(
      new Request("https://localhost:42144/api/incidents"),
    );

    expect(res.headers.get("x-trace-id")).toBe("abc-123");
  });

  test("forwards the destination status code", async () => {
    setEnv({ ENEI_DESTINATION: "https://postman-echo.com" });

    stubFetch(async () => new Response("not found", { status: 404 }));

    const res = await catchAll(
      new Request("https://localhost:42144/api/incidents"),
    );

    expect(res.status).toBe(404);
  });
});
