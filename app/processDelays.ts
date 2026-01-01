export async function processDelays(pathnameAndSearch: string, body: string) {
  let enei_delay_request = false;
  if (
    process.env.ENEI_DELAY_1_PATH_REGEX ||
    process.env.ENEI_DELAY_1_BODY_REGEX
  ) {
    const regexPath = new RegExp(String(process.env.ENEI_DELAY_1_PATH_REGEX));
    const regexBody = new RegExp(String(process.env.ENEI_DELAY_1_BODY_REGEX));
    if (regexPath.test(pathnameAndSearch) || regexBody.test(body)) {
      enei_delay_request = true; // TODO: Geht so nicht mehr!
      await new Promise((resolve) =>
        setTimeout(resolve, Number(process.env.ENEI_DELAY_1_MILLISECONDS))
      );
    }
  }

  // TODO: The same is needed for 2 and 3!!

  return enei_delay_request;
}
