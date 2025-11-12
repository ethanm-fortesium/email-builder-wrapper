import { z } from 'zod';

const SocialSchema = z
  .object({
    linkedIn: z.string().url().optional().nullable(),
    facebook: z.string().url().optional().nullable(),
    twitter: z.string().url().optional().nullable(),
    instagram: z.string().url().optional().nullable(),
  })
  .optional()
  .nullable();

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
    fontFamily: z.string().optional().nullable(),
    fontSize: z.number().int().min(8).max(32).optional().nullable(),
    fontWeight: z.union([z.string(), z.number()]).optional().nullable(),
    textAlign: z.enum(['left', 'center', 'right']).optional().nullable(),
  })
  .optional()
  .nullable();

const SignaturePropsSchema = z.object({
  style: StyleSchema,
  props: z
    .object({
      fullName: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
      company: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      logoUrl: z.string().optional().nullable(),
      logoWidth: z.number().int().min(24).max(600).optional().nullable(),
      social: SocialSchema,
      disclaimerHtml: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type SignatureProps = z.infer<typeof SignaturePropsSchema>;
export default SignaturePropsSchema;
