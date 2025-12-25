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

// const proxy = {
//   port: process.env.PORT ? Number(process.env.PORT) : 42144,

//   async fetch(req: Request): Promise<Response> {
//     const time = new Date();
//     const url = new URL(req.url);
//     const targetUrl = new URL(url.pathname + url.search, APP_DESTINATION);

//     const headers = new Headers(req.headers);
//     headers.delete("host");
//     headers.delete("accept-encoding");

//     let body: any = null;
//     if (req.body) {
//       body = await req.text();
//     }

//     try {
//       const upstream = await fetch(targetUrl.toString(), {
//         method: req.method,
//         headers,
//         body,
//       });

//       const responseText = await upstream.text();

//       logRequest(
//         time,
//         targetUrl,
//         upstream.status,
//         req.method,
//         responseText.slice(0, 2000)
//       );

//       const responseHeaders = new Headers(upstream.headers);
//       responseHeaders.delete("content-encoding");

//       return new Response(responseText, {
//         status: upstream.status,
//         headers: responseHeaders,
//       });
//     } catch (err) {
//       return proxy.error(err as Error);
//     }
//   },

//   error(error: Error): Response {
//     console.error("Server error:", error);
//     return new Response("Internal Server Error", { status: 500 });
//   },
// };

// export default proxy;
