// @vitest-environment happy-dom
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import validateJsonStringValue from './validateJsonStringValue.js';

// The importable test emails in the repository root must keep passing the Import JSON check, and
// lose nothing on the way in (the schemas drop keys they do not know, so a misspelt setting would
// otherwise vanish silently). A file that is not there (not checked out) is skipped.

const TEST_EMAILS = ['table-test-email.json', 'outlook-test-email.json'];

const fileOf = (name: string) => fileURLToPath(new URL(`../../../../${name}`, import.meta.url));

/** Ids of the blocks a block holds (Container children, ColumnsContainer column children, layout children). */
function childIds(block: { type: string; data: any }): string[] {
  switch (block.type) {
    case 'EmailLayout':
      return block.data.childrenIds ?? [];
    case 'Container':
      return block.data.props?.childrenIds ?? [];
    case 'ColumnsContainer':
      return (block.data.props?.columns ?? []).flatMap((column: { childrenIds: string[] }) => column.childrenIds);
    default:
      return [];
  }
}

describe.each(TEST_EMAILS)('%s', (name) => {
  const exists = fs.existsSync(fileOf(name));

  it.skipIf(!exists)('passes the Import JSON check with every setting kept', () => {
    const text = fs.readFileSync(fileOf(name), 'utf8');
    const { data, error } = validateJsonStringValue(text);
    expect(error).toBeUndefined();
    expect(data).toEqual(JSON.parse(text));
  });

  it.skipIf(!exists)('references only blocks it contains, and uses every block once', () => {
    const document = JSON.parse(fs.readFileSync(fileOf(name), 'utf8')) as Record<string, { type: string; data: any }>;
    const referenced = Object.values(document).flatMap(childIds);
    expect(referenced.filter((id) => !(id in document))).toEqual([]);
    expect(new Set(referenced).size).toBe(referenced.length);
    expect(Object.keys(document).filter((id) => id !== 'root' && !referenced.includes(id))).toEqual([]);
  });
});
