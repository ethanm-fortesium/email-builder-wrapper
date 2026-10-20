import React from 'react';

// Collects CSS that blocks need in the document <head> while the body renders.
// renderToStaticMarkup renders the body first, then emits each bucket:
// - 'responsive': rules placed inside the mobile @media query.
// - 'mso': rules placed inside the Outlook-only <!--[if mso]><style> block
//   (e.g. MSO-only classes that browsers never see).
// Rules are de-duplicated and kept in insertion order. Never add CSS comments:
// Yahoo drops the rule that follows a comment.
export type StyleBucket = 'responsive' | 'mso';

export type StyleRegistry = {
  add: (bucket: StyleBucket, css: string) => void;
  get: (bucket: StyleBucket) => string[];
};

export function createStyleRegistry(): StyleRegistry {
  const buckets: Record<StyleBucket, Set<string>> = { responsive: new Set(), mso: new Set() };
  return {
    add: (bucket, css) => {
      buckets[bucket].add(css);
    },
    get: (bucket) => Array.from(buckets[bucket]),
  };
}

export const StyleRegistryContext = React.createContext<StyleRegistry | null>(null);

/** The registry for the render in progress, or null outside renderToStaticMarkup. */
export function useStyleRegistry() {
  return React.useContext(StyleRegistryContext);
}
