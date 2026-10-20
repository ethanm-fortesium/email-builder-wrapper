import { describe, expect, it } from 'vitest';

import {
  normaliseLinkInput,
  repairEmailHref,
  repairEmailLinksInHtml,
  validateLinkInput,
} from './linkHref.js';

const ADDRESS = 'quality.assurance@collegeofdietitians.org';

describe('normaliseLinkInput', () => {
  it('turns a bare email address into a mailto: link', () => {
    expect(normaliseLinkInput(` ${ADDRESS} `)).toBe(`mailto:${ADDRESS}`);
  });

  it('keeps mailto: and tel: links as typed', () => {
    expect(normaliseLinkInput(`mailto:${ADDRESS}`)).toBe(`mailto:${ADDRESS}`);
    expect(normaliseLinkInput(`MAILTO:${ADDRESS}?subject=SDL%20Tool`)).toBe(`MAILTO:${ADDRESS}?subject=SDL%20Tool`);
    expect(normaliseLinkInput('tel:+14165981725')).toBe('tel:+14165981725');
  });

  it('prefixes https:// to web addresses only', () => {
    expect(normaliseLinkInput('collegeofdietitians.org')).toBe('https://collegeofdietitians.org');
    expect(normaliseLinkInput('http://example.com/path')).toBe('http://example.com/path');
    expect(normaliseLinkInput('   ')).toBe('');
  });
});

describe('validateLinkInput', () => {
  it('accepts web, email and phone links', () => {
    expect(validateLinkInput('example.com')).toBeNull();
    expect(validateLinkInput('https://medium.com/@someone')).toBeNull();
    expect(validateLinkInput(ADDRESS)).toBeNull();
    expect(validateLinkInput(`mailto:${ADDRESS}`)).toBeNull();
    expect(validateLinkInput(`mailto:${ADDRESS},info@example.com?subject=Hi`)).toBeNull();
    expect(validateLinkInput('tel:+1 416-598-1725')).toBeNull();
  });

  it('rejects malformed email and phone links', () => {
    expect(validateLinkInput('mailto:')).toMatch(/email/i);
    expect(validateLinkInput('mailto:quality.assurance@')).toMatch(/email/i);
    expect(validateLinkInput('tel:call-us')).toMatch(/phone/i);
  });

  it('rejects web addresses with login details, which browsers would show and open as the bare host', () => {
    expect(validateLinkInput(`https://${ADDRESS}`)).toMatch(/email/i);
    expect(validateLinkInput(`${ADDRESS}/contact`)).toMatch(/email/i);
  });

  it('keeps the existing web address checks', () => {
    expect(validateLinkInput('')).toMatch(/enter/i);
    expect(validateLinkInput('localhost')).toMatch(/dot/i);
    expect(validateLinkInput('example.c0m')).toMatch(/letters/i);
  });
});

describe('repairEmailHref', () => {
  it('repairs email addresses saved behind https://', () => {
    expect(repairEmailHref(`https://${ADDRESS}`)).toBe(`mailto:${ADDRESS}`);
    expect(repairEmailHref(`https://${ADDRESS}/`)).toBe(`mailto:${ADDRESS}`);
    expect(repairEmailHref(`https://mailto:${ADDRESS}`)).toBe(`mailto:${ADDRESS}`);
    expect(repairEmailHref(`http://mailto:${ADDRESS}?subject=Hi`)).toBe(`mailto:${ADDRESS}?subject=Hi`);
  });

  it('leaves other links alone', () => {
    for (const href of [
      'https://collegeofdietitians.org',
      'https://medium.com/@someone',
      'https://user:secret@example.com',
      `https://${ADDRESS}/path`,
      `mailto:${ADDRESS}`,
    ]) {
      expect(repairEmailHref(href)).toBe(href);
    }
  });
});

describe('repairEmailLinksInHtml', () => {
  it('repairs the href of anchors only', () => {
    const html =
      `<p>contact <a href="https://${ADDRESS}" rel="noopener noreferrer" target="_blank">${ADDRESS}</a>` +
      ` or <a target="_blank" href="https://mailto:info@example.com">us</a>.` +
      ` <a href="https://collegeofdietitians.org">site</a> href="https://${ADDRESS}"</p>`;
    expect(repairEmailLinksInHtml(html)).toBe(
      `<p>contact <a href="mailto:${ADDRESS}" rel="noopener noreferrer" target="_blank">${ADDRESS}</a>` +
        ` or <a target="_blank" href="mailto:info@example.com">us</a>.` +
        ` <a href="https://collegeofdietitians.org">site</a> href="https://${ADDRESS}"</p>`
    );
  });
});
