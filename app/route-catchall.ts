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
  enei_request_options.headers.host = new URL(env.ENEI_DESTINATION).host;

  // let the user inject request headers
  let custom_forward_headers = env.ENEI_FORWARD_CUSTOM_HEADERS ?? {};
  if (Object.keys(custom_forward_headers).length) {
    Object.keys(custom_forward_headers).forEach((x) => {
      enei_request_options.headers[x] = custom_forward_headers[x];
    });
  }

  // remove content-encoding so that bun will set its own
  delete enei_request_options.headers["accept-encoding"];

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
  //
  const enei_request = new Request(enei_url, enei_request_options);
  const enei_response = await fetch(enei_request);

  // get the response data
  const enei_response_body = await enei_response.text();
  const enei_response_headers = JSON.parse(
    JSON.stringify(enei_response.headers),
  );
  // remove content-encoding so that bun will set its own
  delete enei_response_headers["content-encoding"];

  // let the user inject response headers
  let custom_backward_headers = env.ENEI_FORWARD_CUSTOM_HEADERS ?? {};
  if (Object.keys(custom_backward_headers).length) {
    Object.keys(custom_backward_headers).forEach((x) => {
      enei_request_options.headers[x] = custom_backward_headers[x];
    });
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
};
