import { env } from './utils/env';

export async function processDelays(pathnameAndSearch: string, body: string) {
  let enei_delay_request = false;
  let enei_delay_request_text = "ENEI-DELAY";

  if (env.ENEI_DELAY_1_PATH_REGEX?.test(pathnameAndSearch) || env.ENEI_DELAY_1_BODY_REGEX?.test(body)) {
    enei_delay_request = true;
    enei_delay_request_text += `-${env.ENEI_DELAY_1_MILLISECONDS}ms`;
    await new Promise((resolve) =>
      setTimeout(resolve, env.ENEI_DELAY_1_MILLISECONDS)
    );
  }

  if (env.ENEI_DELAY_2_PATH_REGEX?.test(pathnameAndSearch) || env.ENEI_DELAY_2_BODY_REGEX?.test(body)) {
    enei_delay_request = true;
    enei_delay_request_text += `-${env.ENEI_DELAY_2_MILLISECONDS}ms`;
    await new Promise((resolve) =>
      setTimeout(resolve, env.ENEI_DELAY_2_MILLISECONDS)
    );
  }

  if (env.ENEI_DELAY_3_PATH_REGEX?.test(pathnameAndSearch) || env.ENEI_DELAY_3_BODY_REGEX?.test(body)) {
    enei_delay_request = true;
    enei_delay_request_text += `-${env.ENEI_DELAY_3_MILLISECONDS}ms`;
    await new Promise((resolve) =>
      setTimeout(resolve, env.ENEI_DELAY_3_MILLISECONDS)
    );
  }

  if (enei_delay_request === false) {
    return "";
  } else {
    return enei_delay_request_text;
  }
}
