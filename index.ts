import { logRequest, logResponse } from "./utils/log";

const server = Bun.serve({
  routes: {
    // Our internal health endpoints.
    // Is /enei/health so that /health will be forwarded to the ENEI_DESTINATION.
    // CAVE: Will never be logged.
    "/enei/health": new Response(null, { status: 204 }),
    "/enei/healthz": new Response(null, { status: 204 }),

    // Catch all route to forward all traffic
    "/*": async (req) => {
      const REQ_ID = Bun.randomUUIDv7();
      const REQ_URL = new URL(req.url);
      let REQ_BODY = "";

      switch (req.method) {
        case "POST":
        case "PUT":
          REQ_BODY = await req.text();
          break;
      }

      // send request data to the logging function
      logRequest(REQ_ID, REQ_URL, req.method, req.headers, REQ_BODY);

      // make the actual request
      // TODO: make user agent work
      // TODO: let user inject headers
      const enei_url = `${process.env.ENEI_DESTINATION}${REQ_URL.pathname}${REQ_URL.search}`;
      const enei_request = new Request(enei_url, {
        method: req.method,
        body: REQ_BODY,
        headers: {
          ...req.headers,
          Host: new URL(String(process.env.ENEI_DESTINATION)).host,
          "Proxy-Authorization": "Bearer my-token",
          "X-Custom-Proxy-Header": "value",
        },
      });
      const enei_response = await fetch(enei_request);
      const enei_response_body = await enei_response.text();

      // send response data to the logging function
      logResponse(
        REQ_ID,
        REQ_URL,
        enei_response.status,
        req.method,
        enei_response.headers,
        enei_response_body
      );

      // create a new Response to answer the client
      return new Response(enei_response_body, {
        status: enei_response.status,
        statusText: enei_response.statusText,
        headers: enei_response.headers,
      });
    },
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
