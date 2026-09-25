import { useEmailLayoutContext } from '../EmailLayout/EmailLayoutContext.js';
import ReaderBlockWrapper from '../helpers/block-wrappers/ReaderBlockWrapper.js';
import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { useTypography } from '../helpers/emailTypography.js';
import { getApiBaseUrl } from '../../editor/EditorContext.js';

import SignatureMarkup, { SocialIcon, hostedSocialIconSrc, isSignatureEmpty } from './SignatureMarkup.js';
import { SignatureProps } from './SignaturePropsSchema.js';

/**
 * Render a Signature block for email: the signature content in a padded, optionally tinted cell.
 *
 * Social icons use the hosted copies under the configured API base URL; exported HTML never
 * contains data: URIs (many clients drop them), so without a base URL the social links are
 * rendered as text links instead.
 *
 * @param style - Signature style: padding and background colour on the cell, font settings and alignment for the content.
 * @param props - Signature content (name, contact details, logo, social links, disclaimer).
 * @returns The signature block, or nothing when the signature is empty.
 */
export default function SignatureReader({ style, props }: SignatureProps) {
  const emailBox = useEmailBox();
  const typography = useTypography();
  const { canvasWidth } = useEmailLayoutContext();

  if (isSignatureEmpty(props)) {
    return <></>;
  }

  const apiBase = getApiBaseUrl();
  const socialIconSrc = (icon: SocialIcon) => hostedSocialIconSrc(apiBase, icon);

  return (
    <ReaderBlockWrapper style={style}>
      <SignatureMarkup
        style={style}
        props={props}
        baseTypography={typography}
        background={style?.backgroundColor ?? emailBox.background}
        contentWidth={insetWidth(emailBox.width, style?.padding)}
        maxWidth={canvasWidth}
        socialIconSrc={socialIconSrc}
      />
    </ReaderBlockWrapper>
  );
}
