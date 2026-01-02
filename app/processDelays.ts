export async function processDelays(pathnameAndSearch: string, body: string) {
  let enei_delay_request = false;
  let enei_delay_request_text = "ENEI-DELAY";
  if (
    process.env.ENEI_DELAY_1_PATH_REGEX ||
    process.env.ENEI_DELAY_1_BODY_REGEX
  ) {
    const regexPath = new RegExp(String(process.env.ENEI_DELAY_1_PATH_REGEX));
    const regexBody = new RegExp(String(process.env.ENEI_DELAY_1_BODY_REGEX));
    if (regexPath.test(pathnameAndSearch) || regexBody.test(body)) {
      enei_delay_request = true;
      enei_delay_request_text += `-${process.env.ENEI_DELAY_1_MILLISECONDS}ms`;
      await new Promise((resolve) =>
        setTimeout(resolve, Number(process.env.ENEI_DELAY_1_MILLISECONDS))
      );
    }
  }

  if (
    process.env.ENEI_DELAY_2_PATH_REGEX ||
    process.env.ENEI_DELAY_2_BODY_REGEX
  ) {
    const regexPath = new RegExp(String(process.env.ENEI_DELAY_2_PATH_REGEX));
    const regexBody = new RegExp(String(process.env.ENEI_DELAY_2_BODY_REGEX));
    if (regexPath.test(pathnameAndSearch) || regexBody.test(body)) {
      enei_delay_request = true;
      enei_delay_request_text += `-${process.env.ENEI_DELAY_2_MILLISECONDS}ms`;
      await new Promise((resolve) =>
        setTimeout(resolve, Number(process.env.ENEI_DELAY_2_MILLISECONDS))
      );
    }
  }

  if (
    process.env.ENEI_DELAY_3_PATH_REGEX ||
    process.env.ENEI_DELAY_3_BODY_REGEX
  ) {
    const regexPath = new RegExp(String(process.env.ENEI_DELAY_3_PATH_REGEX));
    const regexBody = new RegExp(String(process.env.ENEI_DELAY_3_BODY_REGEX));
    if (regexPath.test(pathnameAndSearch) || regexBody.test(body)) {
      enei_delay_request = true;
      enei_delay_request_text += `-${process.env.ENEI_DELAY_3_MILLISECONDS}ms`;
      await new Promise((resolve) =>
        setTimeout(resolve, Number(process.env.ENEI_DELAY_3_MILLISECONDS))
      );
    }
  }

  if (enei_delay_request === false) {
    return "";
  } else {
    return enei_delay_request_text;
  }
}
