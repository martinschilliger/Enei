function parseBoolean(value?: string): boolean {
  if (!value) return false;

  return ["true", "1", "yes", "on"].includes(value.toLowerCase().trim());
}

function parseNumber(value?: string): number | undefined {
  if (value == null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return parsed;
}

function parseRegex(value?: string): RegExp | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return new RegExp(value);
}

function parseJson<T>(value?: string): T | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return JSON.parse(value) as T;
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  return Object.values(value).every(v => typeof v === 'string');
}

function parseJsonObject(value?: string, envName?: string): Record<string, string> | undefined {
  const parsed: unknown = parseJson(value)
  if (!parsed) {
    return undefined;
  }

  if (!isRecordOfStrings(parsed)) {
    let errMsg = 'ENV JSON must be an object of string values';
    if (envName) {
      errMsg = envName + " " + errMsg;
    }
    throw new Error(errMsg);
  }

  return parsed;
}

export const env = {
  ENEI_DESTINATION: process.env.ENEI_DESTINATION || "",

  ENEI_DELAY_1_PATH_REGEX: parseRegex(process.env.ENEI_DELAY_1_PATH_REGEX),

  ENEI_DELAY_1_BODY_REGEX: parseRegex(process.env.ENEI_DELAY_1_BODY_REGEX),

  ENEI_DELAY_1_MILLISECONDS: parseNumber(process.env.ENEI_DELAY_1_MILLISECONDS),

  ENEI_DELAY_2_PATH_REGEX: parseRegex(process.env.ENEI_DELAY_2_PATH_REGEX),

  ENEI_DELAY_2_BODY_REGEX: parseRegex(process.env.ENEI_DELAY_2_BODY_REGEX),

  ENEI_DELAY_2_MILLISECONDS: parseNumber(process.env.ENEI_DELAY_2_MILLISECONDS),

  ENEI_DELAY_3_PATH_REGEX: parseRegex(process.env.ENEI_DELAY_3_PATH_REGEX),

  ENEI_DELAY_3_BODY_REGEX: parseRegex(process.env.ENEI_DELAY_3_BODY_REGEX),

  ENEI_DELAY_3_MILLISECONDS: parseNumber(process.env.ENEI_DELAY_3_MILLISECONDS),

  ENEI_FORWARD_CUSTOM_HEADERS: parseJsonObject(
    process.env.ENEI_FORWARD_CUSTOM_HEADERS, "ENEI_FORWARD_CUSTOM_HEADERS"
  ),

  ENEI_BACKWARD_CUSTOM_HEADERS: parseJsonObject(
    process.env.ENEI_BACKWARD_CUSTOM_HEADERS, "ENEI_BACKWARD_CUSTOM_HEADERS"
  ),

  ENEI_FORWARD_BODY_REGEX: parseRegex(
    process.env.ENEI_FORWARD_BODY_REGEX,
  ),

  ENEI_FORWARD_BODY_REPLACEMENT:
    process.env.ENEI_FORWARD_BODY_REPLACEMENT,

  ENEI_LOG_IGNORE: parseRegex(process.env.ENEI_LOG_IGNORE),

  ENEI_LOG_COLORIZE: parseBoolean(process.env.ENEI_LOG_COLORIZE),

  ENEI_LOG_STATUSCODE_STDERR: parseBoolean(
    process.env.ENEI_LOG_STATUSCODE_STDERR,
  ),

  ENEI_LOG_FORWARD: parseBoolean(process.env.ENEI_LOG_FORWARD),

  ENEI_LOG_FORWARD_HEADERS: parseBoolean(process.env.ENEI_LOG_FORWARD_HEADERS),

  ENEI_LOG_FORWARD_HEADERS_SHOW_SECRETS: parseBoolean(
    process.env.ENEI_LOG_FORWARD_HEADERS_SHOW_SECRETS,
  ),

  ENEI_LOG_FORWARD_BODY: parseBoolean(process.env.ENEI_LOG_FORWARD_BODY),

  ENEI_LOG_FORWARD_BODY_CAP: parseNumber(process.env.ENEI_LOG_FORWARD_BODY_CAP),

  ENEI_LOG_BACKWARD: parseBoolean(process.env.ENEI_LOG_BACKWARD),

  ENEI_LOG_BACKWARD_HEADERS: parseBoolean(
    process.env.ENEI_LOG_BACKWARD_HEADERS,
  ),

  ENEI_LOG_BACKWARD_HEADERS_SHOW_SECRETS: parseBoolean(
    process.env.ENEI_LOG_BACKWARD_HEADERS_SHOW_SECRETS,
  ),

  ENEI_LOG_BACKWARD_BODY: parseBoolean(process.env.ENEI_LOG_BACKWARD_BODY),

  ENEI_LOG_BACKWARD_BODY_CAP: parseNumber(
    process.env.ENEI_LOG_BACKWARD_BODY_CAP,
  ),
};
