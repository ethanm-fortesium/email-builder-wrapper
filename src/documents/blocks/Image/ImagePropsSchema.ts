import { z } from 'zod';

import { ImagePropsSchema as BaseImagePropsSchema } from '@usewaypoint/block-image';

const BasePropsShape = BaseImagePropsSchema.shape.props.unwrap().unwrap().shape;

const ImagePropsSchema = z.object({
  style: BaseImagePropsSchema.shape.style,
  props: z
    .object({
      ...BasePropsShape,
      // Intrinsic pixel size of the image at `url`, recorded when the URL is set (and backfilled
      // for older documents on load). Classic Outlook sizes an <img> purely from its width/height
      // attributes and never derives the height from the width, so the exported HTML needs these
      // to emit a height that keeps the aspect ratio.
      naturalWidth: z.number().int().positive().optional().nullable(),
      naturalHeight: z.number().int().positive().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type ImageProps = z.infer<typeof ImagePropsSchema>;
export default ImagePropsSchema;
