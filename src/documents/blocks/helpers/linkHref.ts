// Link targets typed into the rich text link dialog. Web addresses without a scheme get
// https://, email addresses become mailto: links and tel: links are kept as typed.
//
// Older builds prefixed https:// to everything that was not already http(s), so an email
// address was saved as https://name@example.org (or https://mailto:name@example.org).
// Browsers read the address as login details for the website: hovering shows only
// https://example.org and clicking opens the site. repairEmailHref turns those back into
// mailto: links.

const EMAIL_ADDRESS = /^[^\s@<>()[\]\\,;:"/?#]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}$/i;
const PHONE_NUMBER = /^\+?[\d\s().-]*\d[\d\s().-]*$/;

const MAILTO = /^mailto:/i;
const TEL = /^tel:/i;
const HTTP = /^https?:\/\//i;

/** Whether `value` is a single email address. */
export const isEmailAddress = (value: string) => EMAIL_ADDRESS.test(value);

/**
 * The href for a link typed by the user: http(s), mailto: and tel: links as typed, a bare
 * email address as a mailto: link and anything else as an https:// web address.
 *
 * @returns The href, or '' when `raw` is blank.
 */
export function normaliseLinkInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (HTTP.test(trimmed) || MAILTO.test(trimmed) || TEL.test(trimmed)) return trimmed;
  if (isEmailAddress(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed}`;
}

/**
 * Why a link typed by the user cannot be used, or null when it can.
 */
export function validateLinkInput(raw: string): string | null {
  const href = normaliseLinkInput(raw);
  if (!href) return 'Enter a URL or email address';

  if (MAILTO.test(href)) {
    // mailto:a@example.org,b@example.org?subject=…
    const addresses = href.slice('mailto:'.length).split('?')[0];
    try {
      return decodeURIComponent(addresses).split(',').every((address) => isEmailAddress(address.trim()))
        ? null
        : 'Email address is not valid';
    } catch {
      return 'Email address is not valid';
    }
  }

  if (TEL.test(href)) {
    return PHONE_NUMBER.test(href.slice('tel:'.length)) ? null : 'Phone number is not valid';
  }

  try {
    const parsed = new URL(href);
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'Use http or https links only';
    // Login details (name@ before the host) make browsers show and open only the host,
    // so a mistyped email link would silently become a link to the website.
    if (parsed.username || parsed.password) return 'For an email link, enter just the address (name@example.com)';
    const host = parsed.hostname;
    if (!host) return 'URL must include a host';
    if (!host.includes('.')) return 'Domain must contain a dot (example.com)';
    const tld = host.split('.').pop() || '';
    if (tld.length < 2 || tld.length > 24 || !/^[a-z]+$/i.test(tld)) return 'Domain must end with letters';
    return null;
  } catch {
    return 'URL is not valid';
  }
}

/**
 * The mailto: link an email address saved as https://name@example.org or
 * https://mailto:name@example.org was meant to be; any other href unchanged.
 */
export function repairEmailHref(href: string): string {
  const trimmed = href.trim();
  const prefixedMailto = /^https?:\/\/(mailto:.+)$/i.exec(trimmed);
  if (prefixedMailto) return prefixedMailto[1];
  const prefixedAddress = /^https?:\/\/([^/?#]+)\/?$/i.exec(trimmed);
  if (prefixedAddress && isEmailAddress(prefixedAddress[1])) return `mailto:${prefixedAddress[1]}`;
  return href;
}

// The href of an <a> start tag. `<` in text and `"` in attribute values are escaped in
// serialised HTML, so this only matches real anchors.
const ANCHOR_HREF = /(<a\b[^>]*?\shref=")([^"]*)(")/gi;

/** `html` with the href of every link repaired by repairEmailHref. */
export function repairEmailLinksInHtml(html: string): string {
  if (!html || !/href=/i.test(html)) return html;
  return html.replace(ANCHOR_HREF, (match, start: string, href: string, end: string) => {
    const repaired = repairEmailHref(href);
    return repaired === href ? match : `${start}${repaired}${end}`;
  });
}
