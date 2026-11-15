import { env } from "./utils/env";
import { processDelays } from "./processDelays";
import { logRequest, logResponse } from "./utils/log";

export const catchAll = async (req: Request) => {
  const REQ_ID = Bun.randomUUIDv7().substring(14, 23).replace("-", "");
  const REQ_URL = new URL(req.url);
  let REQ_BODY = "";

  switch (req.method) {
    case "POST":
    case "PUT":
    case "PATCH":
    case "DELETE":
      REQ_BODY = await req.text();
      break;
  }

  //
  // prepare the request
  //

  const enei_url = `${env.ENEI_DESTINATION}${REQ_URL.pathname}${REQ_URL.search}`;
  const enei_request_options = {
    method: req.method,
    body: REQ_BODY,
    headers: JSON.parse(JSON.stringify(req.headers)),
  };
  if (env.ENEI_DESTINATION) {
    enei_request_options.headers.host = new URL(env.ENEI_DESTINATION).host;
  }

  // let the user inject request headers
  let custom_forward_headers = env.ENEI_FORWARD_CUSTOM_HEADERS ?? {};
  if (Object.keys(custom_forward_headers).length) {
    Object.keys(custom_forward_headers).forEach((x) => {
      enei_request_options.headers[x] = custom_forward_headers[x];
    });
  }

  // let the user replace the request body
  if (
    env.ENEI_FORWARD_BODY_REGEX &&
    env.ENEI_FORWARD_BODY_REPLACEMENT
  ) {
    let replacedBody = REQ_BODY.replaceAll(
      new RegExp(env.ENEI_FORWARD_BODY_REGEX, "g"),
      env.ENEI_FORWARD_BODY_REPLACEMENT,
    );

    enei_request_options.body = replacedBody;
  }


  //
  // send request data to the logging function
  //
  logRequest(
    REQ_ID,
    REQ_URL,
    req.method,
    enei_request_options.headers,
    enei_request_options.body,
  );

  //
  // delay the request if needed: test if the path is in ENEI_DELAY_1/2/3_PATH_REGEX or body in ENEI_DELAY_1/2/3_BODY_REGEX
  //
  const enei_delay_request_text = await processDelays(
    `${REQ_URL.pathname}${REQ_URL.search}`,
    REQ_BODY,
  );

  //
  // make the actual request 
  // or if its ENEI_CORS_AUTOACCEPT answer with 204
  // or if no ENEI_DESTINATION is set, mirror the request back
  //

  if (!env.ENEI_DESTINATION) {
    const mirrorBody = JSON.stringify(
      {
        method: req.method,
        url: `${REQ_URL.pathname}${REQ_URL.search}`,
        headers: enei_request_options.headers,
        body: enei_request_options.body,
      },
      null,
      2,
    );

    logResponse(
      REQ_ID,
      REQ_URL,
      200,
      req.method,
      { "content-type": "application/json" },
      mirrorBody,
      enei_delay_request_text,
    );

    return new Response(mirrorBody, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method === "OPTIONS" && env.ENEI_CORS_AUTOACCEPT) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    };

    logResponse(
      REQ_ID,
      REQ_URL,
      204,
      req.method,
      corsHeaders,
      "",
      enei_delay_request_text,
    );

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });

  }
  else {
    const enei_request = new Request(enei_url, enei_request_options);
    const enei_response = await fetch(enei_request);

    // get the response data
    let enei_response_body = await enei_response.text();
    const enei_response_headers = JSON.parse(
      JSON.stringify(enei_response.headers),
    );
    // The body is read via .text(), which decodes gzip and buffers the whole
    // response. The original framing headers no longer apply to the decoded,
    // fully-buffered body we forward, so drop them and let Bun recompute them.
    // Keeping a stale content-length/content-encoding corrupts gzip/chunked
    // responses (client reads a truncated or double-decoded body).
    delete enei_response_headers["content-encoding"];
    delete enei_response_headers["content-length"];
    delete enei_response_headers["transfer-encoding"];

    // inject CORS headers if needed
    if (env.ENEI_CORS_AUTOACCEPT) {
      const corsHeaders: Record<string, string> = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "Authorization, Content-Type",
        "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS"
      };
      Object.keys(corsHeaders).forEach((x) => {
        enei_response_headers[x] = corsHeaders[x];
      });
    }

    // let the user inject response headers
    let custom_backward_headers = env.ENEI_BACKWARD_CUSTOM_HEADERS ?? {};
    if (Object.keys(custom_backward_headers).length) {
      Object.keys(custom_backward_headers).forEach((x) => {
        enei_response_headers[x] = custom_backward_headers[x];
      });
    }

    // let the user replace the response body
    if (
      env.ENEI_BACKWARD_BODY_REGEX &&
      env.ENEI_BACKWARD_BODY_REPLACEMENT
    ) {
      let replacedBody = enei_response_body.replaceAll(
        new RegExp(env.ENEI_BACKWARD_BODY_REGEX, "g"),
        env.ENEI_BACKWARD_BODY_REPLACEMENT,
      );

      enei_response_body = replacedBody;
    }

    //
    // send response data to the logging function
    //
    logResponse(
      REQ_ID,
      REQ_URL,
      enei_response.status,
      req.method,
      enei_response_headers,
      enei_response_body,
      enei_delay_request_text,
    );

    //
    // create a new Response to answer the client
    //
    return new Response(enei_response_body, {
      status: enei_response.status,
      statusText: enei_response.statusText,
      headers: enei_response_headers,
    });
  }
};
