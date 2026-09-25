// insane (HTML allow-list sanitiser used for markdown) ships without type declarations.
declare module 'insane' {
  type InsaneOptions = {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedClasses?: Record<string, string[]>;
    allowedSchemes?: string[];
    filter?: ((token: { tag: string; attrs: Record<string, string> }) => boolean) | null;
    transformText?: ((text: string) => string) | null;
  };

  function insane(html: string, options?: InsaneOptions, strict?: boolean): string;

  export default insane;
}
