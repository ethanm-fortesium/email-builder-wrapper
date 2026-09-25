import React from 'react';
import { z } from 'zod';

import { ButtonPropsDefaults, ButtonPropsSchema } from '@usewaypoint/block-button';

import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { EmailTable, formatPadding } from '../helpers/emailTable.js';
import {
    cssText,
    msoFontStyle,
    quoteFontName,
    resolveTypography,
    snapFontSize,
    toHalfPoints,
    useTypography,
    wordBaselineOffsetPx,
    type Typography,
} from '../helpers/emailTypography.js';
import { getFontFamilyEntry } from '../helpers/fontFamily.js';
import { escapeAttr, escapeHtml, msoOnly, notMso, RawHtml } from '../helpers/rawHtml.js';
import { countLines, measureText, type TextMetricsOptions } from '../helpers/textMetrics.js';
import { VML_NS, WORD_NS, vmlArcsize } from '../helpers/vml.js';

export type ButtonProps = z.infer<typeof ButtonPropsSchema>;

type ButtonSize = NonNullable<ButtonProps['props']>['size'];
type ButtonShape = NonNullable<ButtonProps['props']>['buttonStyle'];
type TextAlign = 'left' | 'center' | 'right';

/** Word insets a v:roundrect's text rectangle by this fraction of the corner radius on every side. */
const ROUNDRECT_TEXT_INSET = 0.29289;

/**
 * Word clips whatever rises above the top of a text box's first line when the line height is
 * exact (the accent of "É"). The label gets this much top margin, in em, taken back from the
 * text box inset, so the text stays where it is and accents have room to render.
 */
const ACCENT_ROOM_EM = 0.5;

/**
 * Word lays out the line holding an inline VML shape this much shorter than the shape, so
 * every button row would pull the content below it up. The block cell's Word-only bottom
 * padding (mso-padding-alt) gives it back.
 */
const VML_LINE_SHORTFALL_PX = 0.5;

/** Border radius written for pills in browsers: any value of at least half the height gives a full pill. */
const PILL_RADIUS_PX = 999;

const NBSP = String.fromCharCode(0xa0);

// Merge tokens ({{FirstName}}) are replaced server-side after rendering, so their final width is unknown.
const MERGE_TOKEN_PATTERN = /\{\{[^}]*\}\}/;

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
 * Corner radius in pixels of a button of the given shape and height.
 *
 * @param shape - The button shape ('rectangle', 'pill', or 'rounded')
 * @param height - The button height in pixels
 * @returns `0` for 'rectangle', half the height for 'pill', and `4` (at most half the height) for 'rounded' (default)
 */
function getRadiusPx(shape: ButtonShape, height: number) {
    switch (shape) {
        case 'rectangle':
            return 0;
        case 'pill':
            return height / 2;
        case 'rounded':
        default:
            return Math.min(4, height / 2);
    }
}

/**
 * Collapse whitespace runs the way browsers render them (ASCII whitespace only, so
 * deliberate non-breaking spaces survive) and trim the ends.
 *
 * @param text - The raw button label
 * @returns The label as it is displayed and measured
 */
export function normaliseButtonLabel(text: string) {
    return text.replace(/[ \t\n\r\f]+/g, ' ').trim();
}

/**
 * Word's font stack for the VML label: the Windows font the browser stack resolves to
 * on Windows, then the stack's generic family. Word does not walk a font list; it
 * substitutes its own match for a missing first family, so the first family must be
 * the installed Windows font the label was measured with.
 *
 * @param typography - Resolved typography with a known `msoFont`
 * @returns A CSS font-family list, e.g. `"Palatino Linotype", serif`
 */
function msoFontStack(typography: Typography) {
    const msoFont = typography.msoFont ?? '';
    const generic = typography.fontFamily.split(',').pop()?.trim() ?? 'sans-serif';
    return `${quoteFontName(msoFont)}, ${generic}`;
}

/** Pixel value rounded to 2 decimals, e.g. `px(3.14159)` -> `'3.14px'`. */
function px(value: number) {
    return `${Math.round(value * 100) / 100}px`;
}

type ButtonGeometry = {
    width: number;
    height: number;
    radius: number;
};

/**
 * Size the button from the unkerned advances of the Windows font Word renders it in,
 * exactly as the browser's auto-width anchor (font-kerning:none) sizes itself.
 *
 * Word lays out the VML label in a box of fixed width, so it needs the width up front:
 * the measured text plus 1px of slack (without it Word wraps the last word of many
 * labels) plus the inline padding, capped at the available width. The line count is
 * decided with that width, so both engines agree on single versus multi-line.
 *
 * @returns The VML shape geometry, or `undefined` when the label cannot be measured
 * (unknown font or glyph, or a merge token whose substituted text is unknown).
 */
function measureButton(
    label: string,
    metrics: TextMetricsOptions | null,
    available: number,
    fullWidth: boolean,
    shape: ButtonShape,
    [paddingBlock, paddingInline]: readonly [number, number],
    lineHeight: number,
): ButtonGeometry | undefined {
    if (!metrics || MERGE_TOKEN_PATTERN.test(label)) {
        return undefined;
    }
    const textWidth = measureText(label, metrics);
    if (textWidth === undefined) {
        return undefined;
    }
    const width = fullWidth ? available : Math.min(Math.ceil(textWidth + 1) + 2 * paddingInline, available);
    const lines = countLines(label, width - 2 * paddingInline, metrics);
    const height = lines * lineHeight + 2 * paddingBlock;
    return { width, height, radius: getRadiusPx(shape, height) };
}

/**
 * Render an email-optimised button: a VML roundrect for classic Outlook and an inline-styled
 * anchor for every other client, sized to render identically in both.
 *
 * The button emits directly into its block cell, which has `font-size:0;line-height:0` so
 * Word adds no line box around the inline shape. The browser anchor keeps its natural
 * (auto) width and wraps on narrow screens. The VML shape gets the same width and line
 * count from the font metrics (see measureButton) and its corner arcsize from the real
 * radius. Its label is set in exact lines of the browser's line height, so
 * mso-fit-shape-to-text sizes the shape to exactly the browser's height (and grows it rather
 * than clipping if Outlook ever wraps differently); the text box insets cancel the
 * roundrect's own text inset and move the text onto the browser's baseline. Insets go
 * negative on small pills and must: clamping them makes Word wrap and clip. Labels that
 * cannot be measured fall back to a table-cell button, the same size everywhere but with
 * square corners in Outlook.
 *
 * @param style - Optional visual overrides applied to the button container and text (padding, backgroundColor, textAlign, fontFamily, fontSize, fontWeight).
 * @param props - Button-specific properties (text, url, fullWidth, size, buttonStyle, buttonBackgroundColor, buttonTextColor); merged with defaults when omitted.
 * @returns A JSX element containing the email-compatible button markup (VML for Outlook and inline HTML/CSS for other clients).
 */
export default function ButtonReader({ style, props }: ButtonProps) {
    const box = useEmailBox();
    const typography = resolveTypography(useTypography(), { fontFamily: style?.fontFamily });
    const alignment: TextAlign = style?.textAlign ?? 'left';

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

    const fontSize = snapFontSize(style?.fontSize ?? 16);
    const fontWeight = style?.fontWeight ?? 'bold';
    const lineHeight = Math.round(fontSize);
    const padding = getPadding(size);
    const [paddingBlock, paddingInline] = padding;
    const textAlign: TextAlign = fullWidth ? alignment : 'center';

    // An empty label still renders a button of one line's height.
    const label = normaliseButtonLabel(text) || NBSP;
    const labelHtml = label === NBSP ? '&nbsp;' : escapeHtml(label);
    const hrefAttr = escapeAttr(href);

    const metrics = typography.msoFont
        ? { font: typography.msoFont, bold: fontWeight === 'bold', sizePx: fontSize }
        : null;
    const available = insetWidth(box.width, style?.padding);
    const geometry = measureButton(label, metrics, available, fullWidth, buttonStyle, padding, lineHeight);
    // Unknown (non-preset) fonts get no font term.
    const baselineDrop = wordBaselineOffsetPx(getFontFamilyEntry(typography.fontKey)?.raiseB ?? 0, fontSize, lineHeight);

    // Browser text is sized by unkerned, unligated advances, like Word lays it out.
    const anchorStyle = {
        display: fullWidth ? 'block' : 'inline-block',
        padding: `${paddingBlock}px ${paddingInline}px`,
        backgroundColor: buttonBackgroundColor,
        color: buttonTextColor,
        fontFamily: typography.fontFamily,
        fontSize: `${fontSize}px`,
        fontWeight,
        lineHeight: `${lineHeight}px`,
        letterSpacing: 0,
        fontKerning: 'none',
        fontVariantLigatures: 'none',
        textAlign,
        textDecoration: 'none',
    };
    const anchor = (extraStyle: Record<string, string | number>) =>
        `<a href="${hrefAttr}" target="_blank" rel="noopener noreferrer" style="${escapeAttr(cssText({ ...anchorStyle, ...extraStyle }))}">${labelHtml}</a>`;

    let html: string;
    let msoPaddingAlt: string | undefined;
    if (geometry) {
        const { width, height, radius } = geometry;
        const radiusInset = ROUNDRECT_TEXT_INSET * radius;
        const horizontalInset = paddingInline - radiusInset;
        const verticalInset = paddingBlock - radiusInset;
        const accentRoom = Math.ceil(ACCENT_ROOM_EM * fontSize);
        const insets = [
            horizontalInset,
            verticalInset - baselineDrop - accentRoom,
            horizontalInset,
            verticalInset + baselineDrop,
        ];
        const labelStyle = cssText({
            margin: `${accentRoom}px 0 0 0`,
            textAlign,
            color: buttonTextColor,
            fontFamily: msoFontStack(typography),
            fontSize: `${fontSize}px`,
            fontWeight,
            letterSpacing: 0,
            msoLineHeightRule: 'exactly',
            lineHeight: `${lineHeight}px`,
        });
        const vml =
            `<v:roundrect ${VML_NS} ${WORD_NS} href="${hrefAttr}" style="width:${width}px;height:${height}px;v-text-anchor:middle" arcsize="${vmlArcsize(radius, width, height)}" fillcolor="${escapeAttr(buttonBackgroundColor)}" stroke="f">` +
            '<w:anchorlock/>' +
            `<v:textbox inset="${insets.map(px).join(',')}" style="mso-fit-shape-to-text:true">` +
            `<p align="${textAlign}" style="${escapeAttr(labelStyle)}">${labelHtml}</p>` +
            '</v:textbox></v:roundrect>';
        // The browser anchor sits in its own block with the label's size and line height. In
        // browsers that changes nothing (the block's line box fits inside the anchor). But if an
        // editor on the way disables the conditional comments (RegulatorOnline's FortMail
        // composer does), Word renders this branch too, and inside the zero line box of the
        // block cell the bare anchor would be invisible; in its own block it stays a readable link.
        const fallback = anchor(radius ? { borderRadius: `${buttonStyle === 'pill' ? PILL_RADIUS_PX : radius}px` } : {});
        html = msoOnly(vml) + notMso(`<div style="font-size:${fontSize}px;line-height:${lineHeight}px">${fallback}</div>`);
        msoPaddingAlt = formatPadding({ ...style?.padding, bottom: (style?.padding?.bottom ?? 0) + VML_LINE_SHORTFALL_PX });
    } else {
        // Table-cell button: Word pads the cell (mso-padding-alt), browsers pad the anchor so the
        // whole button stays clickable. Word sets the label in exact lines, raised onto the
        // browser's baseline; its top padding is a paragraph margin instead, which leaves room
        // above the first line for accents. The cell sets no browser line-height, keeping the
        // zero line box inherited from the block cell. The anchor fills the cell with the same
        // background, so it carries the cell's corner radius too or its square corners would cover
        // the rounded ones.
        const radius = getRadiusPx(buttonStyle, lineHeight + 2 * paddingBlock);
        const borderRadius = radius ? `${buttonStyle === 'pill' ? PILL_RADIUS_PX : radius}px` : undefined;
        const cellStyle = cssText({
            backgroundColor: buttonBackgroundColor,
            borderRadius,
            msoPaddingAlt: `0 ${paddingInline}px ${paddingBlock}px ${paddingInline}px`,
            msoLineHeightRule: 'exactly',
            msoLineHeightAlt: `${lineHeight}px`,
        });
        const tableStyle = fullWidth ? 'width:100%;border-collapse:separate' : 'border-collapse:separate;display:inline-table';
        html =
            `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${fullWidth ? ' width="100%"' : ''} style="${tableStyle}"><tr>` +
            `<td align="${textAlign}" bgcolor="${escapeAttr(buttonBackgroundColor)}" style="${escapeAttr(cellStyle)}">` +
            `<p style="margin:0;mso-margin-top-alt:${paddingBlock}px">` +
            anchor({
                ...(borderRadius ? { borderRadius } : {}),
                ...(msoFontStyle(typography) as Record<string, string>),
                msoTextRaise: `${toHalfPoints(baselineDrop)}pt`,
            }) +
            '</p></td></tr></table>';
    }

    return (
        <EmailTable
            backgroundColor={style?.backgroundColor}
            padding={style?.padding}
            align={alignment}
            extraCellStyle={{ fontSize: 0, lineHeight: 0, textAlign: alignment, msoPaddingAlt } as React.CSSProperties}
        >
            <RawHtml html={html} />
        </EmailTable>
    );
}
