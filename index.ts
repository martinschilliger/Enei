import { catchAll } from "./app/route-catchall";

const server = Bun.serve({
  routes: {
    // Our internal health endpoints.
    // Is /enei/health so that /health will be forwarded to the ENEI_DESTINATION.
    // CAVE: Will never be logged.
    "/enei/health": new Response(null, { status: 204 }),
    "/enei/healthz": new Response(null, { status: 204 }),

    // Catch all route to forward all traffic
    "/*": catchAll,
  },
});

console.log(`Bun ${Bun.version} is listening on ${server.url}`);
