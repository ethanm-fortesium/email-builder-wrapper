import { EmailLayoutProps } from '../EmailLayout/EmailLayoutPropsSchema.js';
import { clampCanvasWidth, getLayoutTypography } from '../EmailLayout/emailLayoutShared.js';
import { insetWidth } from '../helpers/emailBox.js';
import { formatPadding } from '../helpers/emailTable.js';
import { resolveFontFamily } from '../helpers/emailTypography.js';
import linkedinIconFallback from '../../../assets/social/linkedin.png';
import facebookIconFallback from '../../../assets/social/facebook.png';
import twitterIconFallback from '../../../assets/social/twitter.png';
import instagramIconFallback from '../../../assets/social/instagram.png';
import type { TEditorBlock, TEditorConfiguration } from '../../editor/core.js';
import { useCurrentBlockId } from '../../editor/EditorBlock.js';
import { getApiBaseUrl, useDocument } from '../../editor/EditorContext.js';

import SignatureMarkup, { SocialIcon, hostedSocialIconSrc, isSignatureEmpty } from './SignatureMarkup.js';
import { SignatureProps } from './SignaturePropsSchema.js';

// Bundled icons (inlined as data: URIs) let the canvas show social icons before an API base URL is
// configured. Only the editor uses them: the exported email never contains data: URIs.
const BUNDLED_SOCIAL_ICONS: Record<SocialIcon, string> = {
  linkedin: linkedinIconFallback,
  facebook: facebookIconFallback,
  twitter: twitterIconFallback,
  instagram: instagramIconFallback,
};

/** Ids of the blocks directly inside a Container or ColumnsContainer (other blocks have no children). */
function containerChildIds(block: TEditorBlock): string[] {
  switch (block.type) {
    case 'Container':
      return block.data.props?.childrenIds ?? [];
    case 'ColumnsContainer':
      return block.data.props?.columns?.flatMap((column) => column.childrenIds) ?? [];
    default:
      return [];
  }
}

/**
 * The background colour behind a block as the export resolves it (its email box): that of the
 * closest enclosing Container or ColumnsContainer that sets one.
 *
 * @param document - The editor document.
 * @param blockId - The block, or null outside a block.
 * @returns The colour, or null when no enclosing container sets one (the canvas colour shows through).
 */
function enclosingBackground(document: TEditorConfiguration, blockId: string | null) {
  const parents = new Map<string, string>();
  for (const [id, block] of Object.entries(document)) {
    containerChildIds(block).forEach((childId) => parents.set(childId, id));
  }
  const visited = new Set<string>();
  for (let id = blockId ? parents.get(blockId) : undefined; id && !visited.has(id); id = parents.get(id)) {
    visited.add(id);
    const parent = document[id];
    if ((parent.type === 'Container' || parent.type === 'ColumnsContainer') && parent.data.style?.backgroundColor) {
      return parent.data.style.backgroundColor;
    }
  }
  return null;
}

/**
 * Renders the Signature block on the editor canvas: the same markup the email export uses
 * (SignatureMarkup) inside a padded, optionally tinted cell, typeset from the document's layout,
 * with the disclaimer dimmed against the same background as in the export.
 *
 * If the signature has no content, renders a small "Signature (empty)" placeholder instead
 * (the export renders nothing).
 *
 * @param style - Optional visual overrides (color, backgroundColor, fontFamily, fontSize, fontWeight, textAlign, padding).
 * @param props - Signature data (name, title, company, contact details, logo, social links, disclaimer).
 * @returns A React element representing the composed signature block.
 */
export default function SignatureEditor({ style, props }: SignatureProps) {
  const document = useDocument();
  const blockId = useCurrentBlockId();
  const layout = (document.root?.data ?? {}) as EmailLayoutProps;
  const canvasWidth = clampCanvasWidth(layout.canvasWidth);
  const align = style?.textAlign ?? 'left';

  const apiBase = getApiBaseUrl();
  const socialIconSrc = (icon: SocialIcon) => hostedSocialIconSrc(apiBase, icon) ?? BUNDLED_SOCIAL_ICONS[icon];

  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td align={align} style={{ padding: formatPadding(style?.padding), backgroundColor: style?.backgroundColor ?? undefined }}>
            {isSignatureEmpty(props) ? (
              <div
                style={{
                  fontFamily: style?.fontFamily ? resolveFontFamily(style.fontFamily).fontFamily : undefined,
                  fontSize: 11,
                  fontStyle: 'italic',
                  color: style?.color ?? undefined,
                  opacity: 0.5,
                  textAlign: align,
                }}
              >
                Signature (empty)
              </div>
            ) : (
              <SignatureMarkup
                style={style}
                props={props}
                baseTypography={getLayoutTypography(layout)}
                background={style?.backgroundColor ?? enclosingBackground(document, blockId) ?? layout.canvasColor ?? '#FFFFFF'}
                contentWidth={insetWidth(canvasWidth, style?.padding)}
                maxWidth={canvasWidth}
                socialIconSrc={socialIconSrc}
              />
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
