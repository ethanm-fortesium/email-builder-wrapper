import { z } from 'zod';

const StyleSchema = z
  .object({
    padding: z
      .object({
        top: z.number().int().min(0).default(0),
        bottom: z.number().int().min(0).default(0),
        left: z.number().int().min(0).default(0),
        right: z.number().int().min(0).default(0),
      })
      .optional()
      .nullable(),
    color: z.string().optional().nullable(),
    backgroundColor: z.string().optional().nullable(),
    fontFamily: z.string().optional().nullable(),
    fontSize: z.number().int().min(8).max(48).optional().nullable(),
    fontWeight: z.union([z.string(), z.number()]).optional().nullable(),
    lineHeight: z.number().min(1).max(3).optional().nullable(),
    textAlign: z.enum(['left', 'center', 'right']).optional().nullable(),
  })
  .optional()
  .nullable();

// RichText block stores HTML; consumer can also seed with initial plain text
const RichTextPropsSchema = z.object({
  style: StyleSchema,
  props: z
    .object({
      html: z.string().optional().nullable(),
      initial: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type RichTextProps = z.infer<typeof RichTextPropsSchema>;
export default RichTextPropsSchema;