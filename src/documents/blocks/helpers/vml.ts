// Shared helpers for VML (the only way to draw rounded shapes in classic Outlook).

/**
 * VML v:roundrect arcsize for a CSS border-radius.
 *
 * Word draws the corner radius as arcsize x the SHORTER side, so 50% is a full
 * pill (not arcsize x half the side). Measured in the Word engine: a 40px-tall
 * shape gives r=4 at 10%, r=8 at 20%.
 *
 * @returns The arcsize as a percentage string, e.g. "10%".
 */
export function vmlArcsize(radiusPx: number, widthPx: number, heightPx: number) {
  const shorter = Math.min(widthPx, heightPx);
  if (radiusPx <= 0 || shorter <= 0) {
    return '0%';
  }
  const ratio = Math.min(0.5, radiusPx / shorter);
  return `${Math.round(ratio * 1000) / 10}%`;
}

/** Inline VML namespace declaration (in addition to the one on <html>, which some pipelines strip). */
export const VML_NS = 'xmlns:v="urn:schemas-microsoft-com:vml"';
export const WORD_NS = 'xmlns:w="urn:schemas-microsoft-com:office:word"';
