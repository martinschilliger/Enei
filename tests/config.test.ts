import { describe, expect, test } from "bun:test";

// The `env` singleton parses process.env at import time, so we re-import the
// module with a fresh cache for every scenario. `env.ts` has no internal
// imports, so each query-busted import is a genuinely fresh module.
let importCounter = 0;
async function loadEnv(overrides: Record<string, string>) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("ENEI_")) delete process.env[key];
  }
  Object.assign(process.env, overrides);
  return (await import(`../app/utils/env.ts?test=${importCounter++}`)).env;
}

describe("config parsing", () => {
  test("parses booleans from common truthy values", async () => {
    const env = await loadEnv({
      ENEI_CORS_AUTOACCEPT: "true",
      ENEI_LOG_COLORIZE: "1",
      ENEI_LOG_FORWARD: "yes",
      ENEI_LOG_BACKWARD: "on",
    });

    expect(env.ENEI_CORS_AUTOACCEPT).toBe(true);
    expect(env.ENEI_LOG_COLORIZE).toBe(true);
    expect(env.ENEI_LOG_FORWARD).toBe(true);
    expect(env.ENEI_LOG_BACKWARD).toBe(true);
  });

  test("treats missing or falsy booleans as false", async () => {
    const env = await loadEnv({});

    expect(env.ENEI_CORS_AUTOACCEPT).toBe(false);
    expect(env.ENEI_LOG_FORWARD).toBe(false);
  });

  test("parses numbers and falls back to a default when missing", async () => {
    const env = await loadEnv({ ENEI_TIMEOUT: "60" });

    expect(env.ENEI_TIMEOUT).toBe(60);
  });

  test("throws on an invalid number", async () => {
    expect(loadEnv({ ENEI_TIMEOUT: "not-a-number" })).rejects.toThrow(
      "Invalid number",
    );
  });

  test("parses regex strings into RegExp objects", async () => {
    const env = await loadEnv({ ENEI_DELAY_1_PATH_REGEX: "^\\/api\\/slow" });

    expect(env.ENEI_DELAY_1_PATH_REGEX).toBeInstanceOf(RegExp);
    expect(env.ENEI_DELAY_1_PATH_REGEX?.test("/api/slow/1")).toBe(true);
  });

  test("leaves regex undefined when empty", async () => {
    const env = await loadEnv({});

    expect(env.ENEI_DELAY_1_PATH_REGEX).toBeUndefined();
  });

  test("parses a JSON object of string values", async () => {
    const env = await loadEnv({
      ENEI_FORWARD_CUSTOM_HEADERS: '{"x-api-key": "token-42"}',
    });

    expect(env.ENEI_FORWARD_CUSTOM_HEADERS).toEqual({ "x-api-key": "token-42" });
  });

  test("throws when a JSON env value is not an object of strings", async () => {
    expect(
      loadEnv({ ENEI_FORWARD_CUSTOM_HEADERS: '{"x-api-key": 42}' }),
    ).rejects.toThrow(
      "ENEI_FORWARD_CUSTOM_HEADERS ENV JSON must be an object of string values",
    );
  });
});
