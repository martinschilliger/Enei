export const termColorizedStr = (text: string, color: string) => {
  if (process.env.ENEI_LOG_COLORIZE === "true") {
    return [Bun.color(color, "ansi"), text, "\u001B[0m"].join("");
  } else {
    return text;
  }
};

export const logRequest = (
  id: string,
  url: URL,
  method: string,
  headers: Array,
  body: string
) => {
  // Check if we want to print request
  if (process.env.ENEI_LOG_FORWARD !== "true") {
    return;
  }

  // Check if we want to print response headers
  let headers_str = "";
  if (process.env.ENEI_LOG_FORWARD_HEADERS === "true") {
    headers_str = JSON.stringify(headers);
  }

  // Check if we want to print request body
  if (process.env.ENEI_LOG_FORWARD_BODY === "true") {
    body = JSON.stringify(body);
  } else {
    body = "";
  }

  // cap body log after x chars
  if (process.env.ENEI_LOG_FORWARD_BODY_CAP) {
    const CAP_AFTER = Number(process.env.ENEI_LOG_FORWARD_BODY_CAP);
    body = body.substring(0, CAP_AFTER);
  }

  // REQU and RESP are chosen to be the same length
  logLine(id, url, 0, method, headers_str, body, "REQU");
};

export const logResponse = (
  id: string,
  url: URL,
  status: number,
  method: string,
  headers: Array,
  body: string
) => {
  // Check if we want to print response
  if (process.env.ENEI_LOG_BACKWARD !== "true") {
    return;
  }

  // Check if we want to print response headers
  let headers_str = "";
  if (process.env.ENEI_LOG_BACKWARD_HEADERS === "true") {
    headers_str = JSON.stringify(headers);
  }

  // Check if we want to print response body
  if (process.env.ENEI_LOG_BACKWARD_BODY === "true") {
    body = JSON.stringify(body);
  } else {
    body = "";
  }

  // cap body log after x chars
  if (process.env.ENEI_LOG_BACKWARD_BODY_CAP) {
    const CAP_AFTER = Number(process.env.ENEI_LOG_BACKWARD_BODY_CAP);
    body = body.substring(0, CAP_AFTER);
  }

  // REQU and RESP are chosen to be the same length
  logLine(id, url, status, method, headers_str, body, "RESP");
};

const logLine = (
  id: string,
  url: URL,
  status: number,
  method: string,
  headers: string,
  body: string,
  type: string
) => {
  // Format values for the log
  let time = new Date();
  let time_log = `${time.toTimeString().substring(0, 8)}.${time
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;
  let path_log = url.pathname + url.search;
  let status_log = status ? String(status) : "   "; // to be always 3 chars
  let type_log = `[${type}]`;
  let id_log = `[${id}]`;

  // Test if the pathname is in ENEI_LOG_IGNORE
  if (process.env.ENEI_LOG_IGNORE) {
    const regex = new RegExp(process.env.ENEI_LOG_IGNORE);
    if (regex.test(path_log)) {
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
    termColorizedStr(JSON.stringify(path_log), "yellow"),
    termColorizedStr(headers, "blue"),
    termColorizedStr(body, "brown"),
  ];
  // print to stderr, if configured so
  if (status >= 400 && process.env.ENEI_LOG_STATUSCODE_STDERR === "true") {
    console.error(...log_data);
  } else {
    console.log(...log_data);
  }
};
