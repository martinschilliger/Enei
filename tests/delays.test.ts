import { beforeEach, describe, expect, test } from "bun:test";
import { env } from "../app/utils/env";
import { processDelays } from "../app/processDelays";

// `env` is a plain singleton object whose properties are writable. We reset
// and set them directly per test, so no module re-import is needed and the
// production code stays untouched.
function setEnv(overrides: Record<string, unknown>) {
  for (const key of Object.keys(env)) delete (env as Record<string, unknown>)[key];
  Object.assign(env, overrides);
}

beforeEach(() => setEnv({}));

describe("request delays", () => {
  test("returns empty when nothing matches", async () => {
    setEnv({
      ENEI_DELAY_1_PATH_REGEX: /^\/api\/slow/,
      ENEI_DELAY_1_MILLISECONDS: 100,
    });

    const result = await processDelays("/api/fast", "");
    expect(result).toBe("");
  });

  test("delays when the path matches", async () => {
    setEnv({
      ENEI_DELAY_1_PATH_REGEX: /^\/api\/slow/,
      ENEI_DELAY_1_MILLISECONDS: 100,
    });

    const started = Date.now();
    const result = await processDelays("/api/slow/1", "");
    const elapsed = Date.now() - started;

    expect(result).toBe("ENEI-DELAY-100ms");
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test("delays when the body matches", async () => {
    setEnv({
      ENEI_DELAY_1_BODY_REGEX: /slow/,
      ENEI_DELAY_1_MILLISECONDS: 100,
    });

    const result = await processDelays("/api/fast", '{"kind":"slow"}');
    expect(result).toBe("ENEI-DELAY-100ms");
  });

  test("accumulates multiple matching delays", async () => {
    setEnv({
      ENEI_DELAY_1_PATH_REGEX: /^\/api\/slow/,
      ENEI_DELAY_1_MILLISECONDS: 100,
      ENEI_DELAY_2_PATH_REGEX: /^\/api\/slow/,
      ENEI_DELAY_2_MILLISECONDS: 100,
    });

    const started = Date.now();
    const result = await processDelays("/api/slow/1", "");
    const elapsed = Date.now() - started;

    expect(result).toBe("ENEI-DELAY-100ms-100ms");
    expect(elapsed).toBeGreaterThanOrEqual(200);
  });
});
