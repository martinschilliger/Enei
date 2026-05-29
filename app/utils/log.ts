import { env } from './env';

export const termColorizedStr = (text: string, color: string) => {
  if (text.length === 0) {
    return "[__ENEI_DO_NOT_PRINT__]";
  }
  if (env.ENEI_LOG_COLORIZE) {
    return [Bun.color(color, "ansi"), text, "\u001B[0m"].join("");
  } else {
    return text;
  }
};

const redactSensitiveHeaders = (headers: Object) => {
  let headersClone = JSON.parse(JSON.stringify(headers));
  Object.keys(headersClone).forEach((key) => {
    switch (key.toLowerCase()) {
      case "authorization": // Bearer tokens, Basic auth
      case "proxy-authorization": // Proxy credentials
      case "x-api-key": // Custom API key headers
      case "x-auth-token": // Custom auth tokens
      case "cookie": // Session cookies
      case "set-cookie": // Cookies sent by server
      case "x-csrf-token": // CSRF protection token
      case "x-requested-with": // Sometimes used for auth
      case "x-forwarded-for": // Can expose client IPs
      case "x-session-id": // Session identifiers
      case "x-client-secret": // Custom client secrets
      case "x-oauth-token": // OAuth tokens
      case "x-access-token": // Access tokens
      case "x-secret": // Any custom secret header
      case "www-authenticate": // Auth challenge info
        headersClone[key] = "[redacted]";
        break;
    }
  });
  return headersClone;
};

export const logRequest = (
  id: string,
  url: URL,
  method: string,
  headers: Object,
  body: string,
  additional?: string
) => {
  // Check if we want to print request
  if (!env.ENEI_LOG_FORWARD) {
    return;
  }

  // Check if we want to print response headers
  let headers_str = "";
  if (env.ENEI_LOG_FORWARD_HEADERS) {
    if (env.ENEI_LOG_FORWARD_HEADERS_SHOW_SECRETS) {
      headers_str = JSON.stringify(headers);
    } else {
      headers_str = JSON.stringify(redactSensitiveHeaders(headers));
    }
  }

  // Check if we want to print request body
  if (!env.ENEI_LOG_FORWARD_BODY) {
    body = ""; // safe because body is a string (no reference to real body)
  }

  // cap body log after x chars
  if (env.ENEI_LOG_FORWARD_BODY_CAP) {
    body = body.substring(0, env.ENEI_LOG_FORWARD_BODY_CAP);
  }

  // REQU and RESP are chosen to be the same length
  logLine(id, url, 0, method, headers_str, body, "REQUEST", additional);
};

export const logResponse = (
  id: string,
  url: URL,
  status: number,
  method: string,
  headers: Object,
  body: string,
  additional?: string
) => {
  // Check if we want to print response
  if (!env.ENEI_LOG_BACKWARD) {
    return;
  }

  // Check if we want to print response headers
  let headers_str = "";
  if (env.ENEI_LOG_BACKWARD_HEADERS) {
    if (env.ENEI_LOG_BACKWARD_HEADERS_SHOW_SECRETS) {
      headers_str = JSON.stringify(headers);
    } else {
      headers_str = JSON.stringify(redactSensitiveHeaders(headers));
    }
  }

  // Check if we want to print response body
  if (!env.ENEI_LOG_BACKWARD_BODY) {
    body = ""; // safe because body is a string (no reference to real body)
  }

  // cap body log after x chars
  if (env.ENEI_LOG_BACKWARD_BODY_CAP) {
    body = body.substring(0, env.ENEI_LOG_BACKWARD_BODY_CAP);
  }

  logLine(id, url, status, method, headers_str, body, "RESPONSE", additional);
};

const logLine = (
  id: string,
  url: URL,
  status: number,
  method: string,
  headers: string,
  body: string,
  type: string,
  additional?: string
) => {
  // Format values for the log
  let time = new Date();
  let time_log = `${time.toTimeString().substring(0, 8)}.${time
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;
  let path_log = url.pathname + url.search;
  let status_log = status ? String(status) : "";
  let type_log = `[${type}]`;
  let id_log = `[${id}]`;
  let additional_log = additional ? `[${additional}]` : "";

  // Test if the pathname is in ENEI_LOG_IGNORE
  if (env.ENEI_LOG_IGNORE) {
    if (env.ENEI_LOG_IGNORE.test(path_log)) {
      return;
    }
  }

  // Now finally print to console
  let log_data = [
    termColorizedStr(time_log, "white"),
    termColorizedStr(type_log, "grey"),
    termColorizedStr(method, "orange"),
    termColorizedStr(status_log, status < 400 ? "green" : "red"),
    termColorizedStr(id_log, "grey"),
    termColorizedStr(additional_log, "grey"),
    termColorizedStr(path_log, "yellow"),
    termColorizedStr(headers, "blue"),
    termColorizedStr(body, "brown"),
  ].filter((x) => x != "[__ENEI_DO_NOT_PRINT__]");
  // print to stderr, if configured so
  if (status >= 400 && env.ENEI_LOG_STATUSCODE_STDERR) {
    console.error(...log_data);
  } else {
    console.log(...log_data);
  }
};
