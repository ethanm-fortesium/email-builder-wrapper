import React from 'react';

import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { EmailTable } from '../helpers/emailTable.js';
import { useTypography } from '../helpers/emailTypography.js';

import TableMarkup from './TableMarkup.js';
import { TableProps } from './TablePropsSchema.js';
import { isTableEmpty } from './tableGeometry.js';

/**
 * Render a Table block for email: the table in a padded, optionally tinted cell.
 *
 * @param style - Padding and background colour on the cell; font family, size and colour for the cells.
 * @param props - Cell text, header row/column, column settings, borders and colours.
 * @returns The table block, or nothing when no cell has any text.
 */
export default function TableReader({ style, props }: TableProps) {
  const box = useEmailBox();
  const typography = useTypography();

  if (isTableEmpty(props?.rows)) {
    return <></>;
  }

  const padding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;
  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding}>
      <TableMarkup
        style={style}
        props={props}
        baseTypography={typography}
        background={backgroundColor ?? box.background}
        width={insetWidth(box.width, padding)}
      />
    </EmailTable>
  );
}
