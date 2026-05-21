import EMPTY_EMAIL_MESSAGE from './sample/empty-email-message.js';

/**
 * Obtain a configuration object from a template string encoded with the `#code/` prefix.
 *
 * If the template contains a valid encoded configuration after the `#code/` prefix, it returns
 * the parsed object; otherwise it returns the fallback `EMPTY_EMAIL_MESSAGE`.
 *
 * @param template - Template string that may contain a base64- and URI-encoded JSON configuration prefixed with `#code/`
 * @returns The parsed configuration object when present and valid, otherwise `EMPTY_EMAIL_MESSAGE`
 */
export default function getConfiguration(template: string) {

  if (template.startsWith('#code/')) {
    const encodedString = template.replace('#code/', '');
    const configurationString = decodeURIComponent(atob(encodedString));
    try {
      return JSON.parse(configurationString);
    } catch {
      console.error(`Couldn't load configuration from hash.`);
    }
  }

  return EMPTY_EMAIL_MESSAGE;
}