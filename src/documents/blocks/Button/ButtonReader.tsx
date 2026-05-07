import React from 'react';
import { z } from 'zod';

import { ButtonPropsDefaults, ButtonPropsSchema } from '@usewaypoint/block-button';

import { useEmailLayoutContext } from '../EmailLayout/EmailLayoutContext.js';
import { EmailTable, resolveFontFamily } from '../helpers/emailTable.js';

export type ButtonProps = z.infer<typeof ButtonPropsSchema>;

type ButtonSize = NonNullable<ButtonProps['props']>['size'];
type ButtonShape = NonNullable<ButtonProps['props']>['buttonStyle'];

/**
 * Selects vertical and horizontal padding values for a button based on its size.
 *
 * @param size - The button size identifier (`'x-small' | 'small' | 'medium' | 'large'`)
 * @returns A two-element tuple `[paddingBlock, paddingInline]` in pixels where `paddingBlock` is the vertical (top/bottom) padding and `paddingInline` is the horizontal (left/right) padding
 */
function getPadding(size: ButtonSize) {
    switch (size) {
        case 'x-small':
            return [4, 8] as const;
        case 'small':
            return [8, 12] as const;
        case 'large':
            return [16, 32] as const;
        case 'medium':
        default:
            return [12, 20] as const;
    }
}

/**
 * Map a button shape to its border-radius in pixels.
 *
 * @param shape - The button shape ('rectangle', 'pill', or 'rounded')
 * @returns The border radius in pixels: `0` for 'rectangle', `999` for 'pill', `4` for 'rounded' (default)
 */
function getRadiusPx(shape: ButtonShape) {
    switch (shape) {
        case 'rectangle':
            return 0;
        case 'pill':
            return 999;
        case 'rounded':
        default:
            return 4;
    }
}

/**
 * Compute the VML `arcsize` ratio to represent a button's corner curvature.
 *
 * @param shape - The button shape; `'pill'` yields an arcsize of `1`, `'rectangle'` yields `0`, other shapes compute based on `radiusPx`
 * @param radiusPx - Corner radius in pixels used to compute the arc height
 * @param height - Button height in pixels; values <= 0 produce an arcsize of `0`
 * @returns A number between `0` and `1` representing the VML `arcsize` (fraction of the button height)
 */
function getArcSize(shape: ButtonShape, radiusPx: number, height: number) {
    if (shape === 'pill') {
        return 1;
    }
    if (shape === 'rectangle') {
        return 0;
    }
    if (height <= 0) {
        return 0;
    }
    const value = (radiusPx * 2) / height;
    return Math.max(0, Math.min(1, value));
}

/**
 * Escape special HTML characters in a string to their corresponding HTML entities.
 *
 * @param value - The input string to sanitize for HTML insertion
 * @returns The input string with `&`, `<`, `>`, `"`, and `'` replaced by their HTML entities
 */
function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => {
        switch (char) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case '\'':
                return '&#39;';
            default:
                return char;
        }
    });
}

/**
 * Convert a CamelCase or PascalCase string to kebab-case.
 *
 * @param value - Input string (commonly camelCase or PascalCase)
 * @returns The kebab-case form of `value` (uppercase letters become `-` followed by their lowercase form)
 */
function camelToKebab(value: string) {
    return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Serialize a style object into a CSS inline string.
 *
 * Converts object entries to `kebab-case:key:value;` pairs, omitting entries whose value is `undefined`, `null`, or the empty string. Numeric values are converted to strings.
 *
 * @param style - Mapping of CSS property names (camelCase or kebabCase) to values; entries with `undefined`, `null`, or `''` are excluded.
 * @returns A concatenated CSS string suitable for use in an inline `style` attribute (e.g. `"font-size:12px;color:#000;"`).
 */
function styleObjectToString(style: Record<string, string | number | undefined>) {
    return Object.entries(style)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => {
            const stringValue = typeof value === 'number' ? String(value) : String(value);
            return `${camelToKebab(key)}:${stringValue};`;
        })
        .join('');
}

/**
 * Render an email-optimized button with an Outlook (VML) fallback and an inline-styled HTML fallback.
 *
 * Renders a table-based button suitable for broad email client compatibility, honoring provided visual
 * style overrides and ButtonProps (text, url, fullWidth, size, shape and colors). The output preserves
 * rounded corners and internal padding for Outlook via VML and uses an inline-styled anchor for non-MSO clients.
 *
 * @param style - Optional visual overrides applied to the button container and text (e.g., padding, backgroundColor, textAlign, fontFamily, fontSize, fontWeight).
 * @param props - Button-specific properties (text, url, fullWidth, size, buttonStyle, buttonBackgroundColor, buttonTextColor); merged with defaults when omitted.
 * @returns A JSX element containing the email-compatible button markup (VML for Outlook and inline HTML/CSS for other clients).
 */
export default function ButtonReader({ style, props }: ButtonProps) {
    const cellPadding = style?.padding ?? undefined;
    const wrapperBackground = style?.backgroundColor ?? undefined;
    const alignment = (style?.textAlign as 'left' | 'center' | 'right' | undefined) ?? 'left';
    const { canvasWidth } = useEmailLayoutContext();

    const mergedProps = {
        ...ButtonPropsDefaults,
        ...(props ?? {}),
    };

    const text = mergedProps.text ?? ButtonPropsDefaults.text;
    const href = mergedProps.url ?? ButtonPropsDefaults.url;
    const fullWidth = Boolean(mergedProps.fullWidth);
    const size = mergedProps.size ?? ButtonPropsDefaults.size;
    const buttonStyle = mergedProps.buttonStyle ?? ButtonPropsDefaults.buttonStyle;
    const buttonBackgroundColor = mergedProps.buttonBackgroundColor ?? ButtonPropsDefaults.buttonBackgroundColor;
    const buttonTextColor = mergedProps.buttonTextColor ?? ButtonPropsDefaults.buttonTextColor;

    const resolvedFontFamily = resolveFontFamily(style?.fontFamily ?? undefined) ?? 'Helvetica, Arial, sans-serif';
    const fontSize = style?.fontSize ?? 16;
    const fontWeight = style?.fontWeight ?? 'bold';
    const lineHeightPx = Math.max(fontSize, Math.round(fontSize * 0.95));
    const trimmedText = text.replace(/\s+/g, ' ').trim();
    const textLengthForEstimate = trimmedText.length > 0 ? trimmedText.length : text.length;
    const characterWidthEstimate = fontSize * 0.7;
    const widthBuffer = Math.round(fontSize * 0.85);
    const [paddingBlock, paddingInline] = getPadding(size);
    const baseTextWidth = Math.round(textLengthForEstimate * characterWidthEstimate);
    const approximateWidth = Math.max(
        baseTextWidth + paddingInline * 2 + widthBuffer,
        fontSize + paddingInline * 2 + 36,
        110,
    );
    const minimumButtonWidth = Math.max(approximateWidth, 96);
    const borderRadius = getRadiusPx(buttonStyle);
    const msoCanvasWidth = canvasWidth >= 750 ? 900 : 600;
    const vmlWidth = fullWidth ? msoCanvasWidth : minimumButtonWidth;
    const vmlHeight = lineHeightPx + paddingBlock * 2;
    const cornerBasis = Math.max(1, Math.min(vmlWidth, vmlHeight));
    const arcSizePercent = `${Math.round(getArcSize(buttonStyle, borderRadius, cornerBasis) * 100)}%`;
    const vmlWidthStyle = `width:${vmlWidth}px;`;
    const vmlHeightStyle = `height:${vmlHeight}px;`;

    const anchorStyle: Record<string, string> = {
        display: fullWidth ? 'block' : 'inline-block',
        textAlign: alignment,
        textDecoration: 'none',
        backgroundColor: buttonBackgroundColor,
        color: buttonTextColor,
        fontFamily: resolvedFontFamily,
        fontSize: `${fontSize}px`,
        fontWeight,
        lineHeight: `${lineHeightPx}px`,
        padding: `${paddingBlock}px ${paddingInline}px`,
        letterSpacing: '0',
        boxSizing: 'border-box',
        msoLineHeightRule: 'exactly',
    };

    if (fullWidth) {
        anchorStyle.width = '100%';
    } else {
        anchorStyle.minWidth = `${minimumButtonWidth}px`;
    }

    if (borderRadius) {
        anchorStyle.borderRadius = `${borderRadius}px`;
    }

    const anchorStyleString = styleObjectToString(anchorStyle);

    // Outlook-only VML markup preserves rounded corners and padding inside the button.
        const vmlTextboxStyle = `mso-fit-shape-to-text:true;`;
        const vmlTableCellStyle = `padding:${paddingBlock}px ${paddingInline}px;text-align:${alignment};color:${buttonTextColor};font-family:${resolvedFontFamily};font-size:${fontSize}px;font-weight:${fontWeight};mso-line-height-rule:exactly;line-height:${lineHeightPx}px;`;
    const vmlTableWidthAttr = fullWidth ? ' width="100%"' : '';
        const vmlTableStyle = fullWidth ? 'width:100%;' : '';
        const vmlShapeStyle = `${vmlWidthStyle}${vmlHeightStyle}v-text-anchor:middle;mso-fit-shape-to-text:true;`;

    const vmlMarkup = `<!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(href)}" style="${escapeHtml(vmlShapeStyle)}" arcsize="${arcSizePercent}" fillcolor="${escapeHtml(buttonBackgroundColor)}" stroke="f">
    <w:anchorlock/>
    <v:textbox inset="0,0,0,0" style="${escapeHtml(vmlTextboxStyle)}" >
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"${vmlTableWidthAttr}${vmlTableStyle ? ` style="${escapeHtml(vmlTableStyle)}"` : ''}>
        <tr>
          <td align="${escapeHtml(alignment)}" style="${escapeHtml(vmlTableCellStyle)}">
            ${escapeHtml(text)}
          </td>
        </tr>
      </table>
    </v:textbox>
</v:roundrect>
<![endif]-->`;

    const tableStyle: React.CSSProperties = {
        borderCollapse: 'separate',
        width: fullWidth ? '100%' : 'auto',
    };

    const cellStyle: React.CSSProperties = {
        textAlign: alignment,
        padding: 0,
    };

    const fallbackSpanStyle = fullWidth ? 'display:block;width:100%;' : 'display:inline-block;';
    const fallbackMarkup = `<!--[if !mso]><!-->
   <span style="${fallbackSpanStyle}">
    <a href="${escapeHtml(href)}" 
        target="_blank" 
        rel="noopener noreferrer" 
        style="${escapeHtml(anchorStyleString)}">
        ${escapeHtml(text)}
     </a>
    </span>
   <!--<![endif]-->`;

    return (
        <EmailTable backgroundColor={wrapperBackground} padding={cellPadding as any} align={alignment}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width={fullWidth ? '100%' : undefined} style={tableStyle}>
                <tbody>
                    <tr>
                        <td
                            align={alignment}
                            style={{
                                ...cellStyle,
                                width: fullWidth ? '100%' : undefined,
                            }}
                        >
                            <span dangerouslySetInnerHTML={{ __html: vmlMarkup }} />
                            <span dangerouslySetInnerHTML={{ __html: fallbackMarkup }} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </EmailTable>
    );
}