import { test, expect } from "bun:test";
import proxy from "../index.ts";

test("proxy forwards and returns response", async () => {
  const server = Bun.serve(proxy);
  const port = server.port;

  const res = await fetch(`http://localhost:${port}/get`);
  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.status).toBeLessThan(500);

  server.stop();
});
