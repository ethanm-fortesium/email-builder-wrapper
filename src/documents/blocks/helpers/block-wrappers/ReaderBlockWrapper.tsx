import { EmailTable } from '../emailTable.js';
import { TStyle } from '../TStyle.js';

type TReaderBlockWrapperProps = {
  style: TStyle | null | undefined;
  children: JSX.Element;
};

/**
 * Wraps a block's content in an EmailTable cell carrying the block's padding, background colour and border.
 *
 * Rounded canvas corners need nothing here: the canvas cell clips its content in browsers, and
 * classic Outlook draws no radius on cells at all.
 *
 * @param style - Block style; `padding`, `backgroundColor` and `borderColor` (a 1px border) style the cell.
 * @param children - The block content.
 * @returns An EmailTable containing `children`.
 */
export default function ReaderBlockWrapper({ style, children }: TReaderBlockWrapperProps) {
  const borderColor = style?.borderColor;
  return (
    <EmailTable
      backgroundColor={style?.backgroundColor}
      padding={style?.padding}
      extraCellStyle={borderColor ? { border: `1px solid ${borderColor}` } : undefined}
      borderWidth={borderColor ? 1 : 0}
    >
      {children}
    </EmailTable>
  );
}
