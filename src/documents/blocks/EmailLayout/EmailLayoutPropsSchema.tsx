import { z } from 'zod';

const COLOR_SCHEMA = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable()
  .optional();

const FONT_FAMILY_SCHEMA = z
  .enum([
    'MODERN_SANS',
    'BOOK_SANS',
    'ORGANIC_SANS',
    'GEOMETRIC_SANS',
    'HEAVY_SANS',
    'ROUNDED_SANS',
    'MODERN_SERIF',
    'BOOK_SERIF',
    'MONOSPACE',
  ])
  .nullable()
  .optional();

const EmailLayoutPropsSchema = z.object({
  backdropColor: COLOR_SCHEMA,
  borderColor: COLOR_SCHEMA,
  borderRadius: z.number().optional().nullable(),
  canvasColor: COLOR_SCHEMA,
  textColor: COLOR_SCHEMA,
  // Explicit link colour for exported links. Without one every client applies its
  // own default (Chromium #0000EE, Gmail #1155CC, Outlook #0000FF).
  linkColor: COLOR_SCHEMA,
  fontFamily: FONT_FAMILY_SCHEMA,
  baseFontSize: z.number().int().min(8).max(48).optional().nullable(),
  childrenIds: z.array(z.string()).optional().nullable(),
  canvasWidth: z
    .number()
    .int()
    .min(480)
    .max(900)
    .optional()
    .nullable(),
});

export default EmailLayoutPropsSchema;

export type EmailLayoutProps = z.infer<typeof EmailLayoutPropsSchema>;
