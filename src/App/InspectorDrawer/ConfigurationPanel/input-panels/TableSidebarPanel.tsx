import React, { useState } from 'react';
import { ZodError } from 'zod';

import { HeightOutlined, SpaceBarOutlined } from '@mui/icons-material';
import { ToggleButton } from '@mui/material';

import TablePropsSchema, { TableProps, TablePropsDefaults } from '../../../../documents/blocks/Table/TablePropsSchema.js';
import { tableCells } from '../../../../documents/blocks/Table/tableEditing.js';

import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import BooleanInput from './helpers/inputs/BooleanInput.js';
import ColorInput, { NullableColorInput } from './helpers/inputs/ColorInput/index.js';
import RadioGroupInput from './helpers/inputs/RadioGroupInput.js';
import SliderInput from './helpers/inputs/SliderInput.js';
import TableCellsInput from './helpers/inputs/TableCellsInput.js';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel.js';

type TableSidebarPanelProps = {
  data: TableProps;
  setData: (v: TableProps) => void;
};

/**
 * Sidebar panel for editing a Table block: its cells and column settings, header row and column,
 * markdown, borders, header and stripe colours, cell padding, and the block's text and box styles.
 *
 * @param data - The current `TableProps` being edited.
 * @param setData - Callback invoked with the updated `TableProps` when validation succeeds.
 * @returns The sidebar panel JSX element for the Table block.
 */
export default function TableSidebarPanel({ data, setData }: TableSidebarPanelProps) {
  const [, setErrors] = useState<ZodError | null>(null);
  const updateData = (d: unknown) => {
    const res = TablePropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const props = data.props ?? {};
  const setProps = (patch: NonNullable<TableProps['props']>) => updateData({ ...data, props: { ...data.props, ...patch } });
  const headerRow = props.headerRow ?? TablePropsDefaults.headerRow;
  const headerColumn = props.headerColumn ?? TablePropsDefaults.headerColumn;
  const cellPadding = props.cellPadding ?? TablePropsDefaults.cellPadding;

  return (
    <BaseSidebarPanel title="Table block">
      <TableCellsInput
        value={tableCells(props.rows, props.columns)}
        headerRow={headerRow}
        headerColumn={headerColumn}
        onChange={({ rows, columns }) => setProps({ rows, columns })}
      />
      <BooleanInput label="Header row" defaultValue={headerRow} onChange={(headerRow) => setProps({ headerRow })} />
      <BooleanInput label="Header column" defaultValue={headerColumn} onChange={(headerColumn) => setProps({ headerColumn })} />
      <BooleanInput
        label="Markdown (bold, italic, links)"
        defaultValue={props.markdown ?? TablePropsDefaults.markdown}
        onChange={(markdown) => setProps({ markdown })}
      />
      <RadioGroupInput
        label="Borders"
        defaultValue={props.borderStyle ?? TablePropsDefaults.borderStyle}
        onChange={(borderStyle) => setProps({ borderStyle: borderStyle as NonNullable<TableProps['props']>['borderStyle'] })}
      >
        <ToggleButton value="none">None</ToggleButton>
        <ToggleButton value="rows">Rows</ToggleButton>
        <ToggleButton value="framed">Framed</ToggleButton>
        <ToggleButton value="grid">Grid</ToggleButton>
      </RadioGroupInput>
      <ColorInput
        label="Border colour"
        defaultValue={props.borderColor ?? TablePropsDefaults.borderColor}
        onChange={(borderColor) => setProps({ borderColor })}
      />
      <NullableColorInput
        label="Header background"
        defaultValue={props.headerBackgroundColor ?? null}
        onChange={(headerBackgroundColor) => setProps({ headerBackgroundColor })}
      />
      <NullableColorInput
        label="Header text colour"
        defaultValue={props.headerTextColor ?? null}
        onChange={(headerTextColor) => setProps({ headerTextColor })}
      />
      <NullableColorInput
        label="Alternate row background"
        defaultValue={props.stripeColor ?? null}
        onChange={(stripeColor) => setProps({ stripeColor })}
      />
      <SliderInput
        label="Cell padding (top and bottom)"
        iconLabel={<HeightOutlined sx={{ color: 'text.secondary' }} />}
        units="px"
        step={2}
        min={0}
        max={24}
        defaultValue={cellPadding.vertical}
        onChange={(vertical) => setProps({ cellPadding: { ...cellPadding, vertical } })}
      />
      <SliderInput
        label="Cell padding (left and right)"
        iconLabel={<SpaceBarOutlined sx={{ color: 'text.secondary' }} />}
        units="px"
        step={2}
        min={0}
        max={32}
        defaultValue={cellPadding.horizontal}
        onChange={(horizontal) => setProps({ cellPadding: { ...cellPadding, horizontal } })}
      />
      <MultiStylePropertyPanel
        names={['color', 'backgroundColor', 'fontFamily', 'fontSize', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
