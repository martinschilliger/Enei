import { logRequest, logResponse } from "./utils/log";

export const catchAll = async (req: Request) => {
  const ENEI_DELAY_MILLISECONDS = Number(process.env.ENEI_DELAY_MILLISECONDS);
  const REQ_ID = Bun.randomUUIDv7();
  const REQ_URL = new URL(req.url);
  let REQ_BODY = "";
  let enei_delay_request = false;

  switch (req.method) {
    case "POST":
    case "PUT":
      REQ_BODY = await req.text();
      break;
  }

  //
  // prepare the request
  //
  const enei_url = `${process.env.ENEI_DESTINATION}${REQ_URL.pathname}${REQ_URL.search}`;
  const enei_request_options = {
    method: req.method,
    body: REQ_BODY,
    headers: JSON.parse(JSON.stringify(req.headers)),
  };
  enei_request_options.headers.host = new URL(
    String(process.env.ENEI_DESTINATION)
  ).host;

  // let the user inject request headers
  if (process.env.ENEI_FORWARD_CUSTOM_HEADERS) {
    try {
      let custom_headers = JSON.parse(process.env.ENEI_FORWARD_CUSTOM_HEADERS);
      if (Object.keys(custom_headers).length) {
        Object.keys(custom_headers).forEach((x) => {
          enei_request_options.headers[x] = custom_headers[x];
        });
      }
    } catch (e) {
      console.error("Could not use ENEI_FORWARD_CUSTOM_HEADERS", e);
    }
  }

  // remove content-encoding so that bun will set its own
  delete enei_request_options.headers["accept-encoding"];

  //
  // send request data to the logging function
  //
  logRequest(
    REQ_ID,
    REQ_URL,
    req.method,
    enei_request_options.headers,
    REQ_BODY
  );

  //
  // delay the request if needed: test if the pathname is in ENEI_DELAY_REGEX
  //
  if (process.env.ENEI_DELAY_REGEX) {
    const regex = new RegExp(process.env.ENEI_DELAY_REGEX);
    if (regex.test(`${REQ_URL.pathname}${REQ_URL.search}`)) {
      enei_delay_request = true;
      await new Promise((resolve) =>
        setTimeout(resolve, ENEI_DELAY_MILLISECONDS)
      );
    }
  }

  //
  // make the actual request
  //
  const enei_request = new Request(enei_url, enei_request_options);
  const enei_response = await fetch(enei_request);

  // get the response data
  const enei_response_body = await enei_response.text();
  const enei_response_headers = JSON.parse(
    JSON.stringify(enei_response.headers)
  );
  // remove content-encoding so that bun will set its own
  delete enei_response_headers["content-encoding"];

  // let the user inject response headers
  if (process.env.ENEI_BACKWARD_CUSTOM_HEADERS) {
    try {
      let custom_headers = JSON.parse(process.env.ENEI_BACKWARD_CUSTOM_HEADERS);
      if (Object.keys(custom_headers).length) {
        Object.keys(custom_headers).forEach((x) => {
          enei_response_headers[x] = custom_headers[x];
        });
      }
    } catch (e) {
      console.error("Could not use ENEI_FORWARD_CUSTOM_HEADERS", e);
    }
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
    enei_delay_request ? `ENEI-DELAY-${ENEI_DELAY_MILLISECONDS}ms` : ""
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
