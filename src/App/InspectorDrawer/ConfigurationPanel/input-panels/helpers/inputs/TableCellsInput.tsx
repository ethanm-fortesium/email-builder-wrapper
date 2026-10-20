import React, { useState } from 'react';

import {
  AddOutlined,
  ArrowDropDownOutlined,
  FormatAlignCenterOutlined,
  FormatAlignLeftOutlined,
  FormatAlignRightOutlined,
  MoreVertOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  InputBase,
  InputLabel,
  Menu,
  MenuItem,
  MenuList,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS, TableAlign } from '../../../../../../documents/blocks/Table/TablePropsSchema.js';
import {
  TableCells,
  insertColumn,
  insertRow,
  isClipboardGrid,
  moveColumn,
  moveRow,
  parseClipboardGrid,
  pasteGrid,
  removeColumn,
  removeRow,
  setCell,
  setColumn,
} from '../../../../../../documents/blocks/Table/tableEditing.js';

const ALIGN_ICONS: Record<TableAlign, JSX.Element> = {
  left: <FormatAlignLeftOutlined fontSize="inherit" />,
  center: <FormatAlignCenterOutlined fontSize="inherit" />,
  right: <FormatAlignRightOutlined fontSize="inherit" />,
};

type Props = {
  value: TableCells;
  headerRow: boolean;
  headerColumn: boolean;
  onChange: (value: TableCells) => void;
};

/**
 * Spreadsheet-style editor for a table's cells: one text field per cell (line breaks allowed),
 * a settings popover per column (alignment, width, insert, move, delete) and a menu per row.
 * Cells copied from Excel, Google Sheets or another table can be pasted into any cell: they fill
 * the table from that cell, adding rows and columns as needed.
 */
export default function TableCellsInput({ value, headerRow, headerColumn, onChange }: Props) {
  const [columnMenu, setColumnMenu] = useState<{ anchor: HTMLElement; index: number } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; index: number } | null>(null);
  const columnCount = value.columns.length;
  const rowCount = value.rows.length;

  const onPaste = (row: number, column: number) => (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData('text/plain');
    if (!isClipboardGrid(text, event.clipboardData.getData('text/html'))) {
      return;
    }
    const grid = parseClipboardGrid(text);
    if (grid.length === 0) {
      return;
    }
    event.preventDefault();
    if (grid.length === 1 && grid[0].length === 1) {
      // One copied cell: insert its text at the cursor, without the line break Excel adds.
      const target = event.currentTarget;
      const current = value.rows[row][column];
      const next = current.slice(0, target.selectionStart ?? current.length) + grid[0][0] + current.slice(target.selectionEnd ?? current.length);
      onChange(setCell(value, row, column, next));
      return;
    }
    onChange(pasteGrid(value, row, column, grid));
  };

  const closeColumnMenu = () => setColumnMenu(null);
  const closeRowMenu = () => setRowMenu(null);
  const act = (next: TableCells, close: () => void) => {
    onChange(next);
    close();
  };

  return (
    <Stack spacing={1}>
      <InputLabel shrink>Cells</InputLabel>
      <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
        <Box
          sx={{
            display: 'grid',
            // Three columns fit the default panel width; more scroll sideways (or widen the panel).
            gridTemplateColumns: `repeat(${columnCount}, minmax(72px, 1fr)) 28px`,
            gap: '4px',
            alignItems: 'start',
            minWidth: 'min-content',
          }}
        >
          {value.columns.map((column, c) => (
            <Button
              key={`column-${c}`}
              size="small"
              color="inherit"
              aria-label={`Column ${c + 1} settings`}
              startIcon={ALIGN_ICONS[column?.align ?? 'left']}
              endIcon={<ArrowDropDownOutlined fontSize="inherit" />}
              onClick={(event) => setColumnMenu({ anchor: event.currentTarget, index: c })}
              sx={{ minWidth: 0, px: 1, justifyContent: 'flex-start', color: 'text.secondary', fontSize: 12, textTransform: 'none', '& .MuiButton-endIcon': { ml: 'auto' } }}
            >
              {column?.width ? `${column.width}%` : 'Auto'}
            </Button>
          ))}
          <Box />
          {value.rows.map((cells, r) => (
            <React.Fragment key={`row-${r}`}>
              {cells.map((cell, c) => {
                const header = (headerRow && r === 0) || (headerColumn && c === 0);
                return (
                  <InputBase
                    key={c}
                    multiline
                    value={cell}
                    onChange={(event) => onChange(setCell(value, r, c, event.target.value))}
                    inputProps={{ 'aria-label': `Row ${r + 1}, column ${c + 1}`, onPaste: onPaste(r, c) }}
                    sx={{
                      fontSize: 13,
                      lineHeight: 1.4,
                      px: 1,
                      py: 0.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '4px',
                      bgcolor: header ? 'cadet.200' : '#FFFFFF',
                      fontWeight: header ? 600 : 400,
                      textAlign: value.columns[c]?.align ?? 'left',
                      '&.Mui-focused': { borderColor: 'primary.main' },
                      '& textarea': { textAlign: 'inherit' },
                    }}
                  />
                );
              })}
              <IconButton
                size="small"
                aria-label={`Row ${r + 1} options`}
                onClick={(event) => setRowMenu({ anchor: event.currentTarget, index: r })}
              >
                <MoreVertOutlined fontSize="small" />
              </IconButton>
            </React.Fragment>
          ))}
        </Box>
      </Box>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          startIcon={<AddOutlined />}
          disabled={rowCount >= MAX_TABLE_ROWS}
          onClick={() => onChange(insertRow(value, rowCount))}
        >
          Row
        </Button>
        <Button
          size="small"
          startIcon={<AddOutlined />}
          disabled={columnCount >= MAX_TABLE_COLUMNS}
          onClick={() => onChange(insertColumn(value, columnCount))}
        >
          Column
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Paste cells copied from Excel or Google Sheets into any cell to fill the table from there.
      </Typography>

      {columnMenu && (
        <ColumnSettings
          key={columnMenu.index}
          anchor={columnMenu.anchor}
          index={columnMenu.index}
          value={value}
          onChange={onChange}
          act={(next) => act(next, closeColumnMenu)}
          onClose={closeColumnMenu}
        />
      )}
      {rowMenu && (
        <Menu open anchorEl={rowMenu.anchor} onClose={closeRowMenu}>
          <MenuItem disabled={rowCount >= MAX_TABLE_ROWS} onClick={() => act(insertRow(value, rowMenu.index), closeRowMenu)}>
            Insert row above
          </MenuItem>
          <MenuItem disabled={rowCount >= MAX_TABLE_ROWS} onClick={() => act(insertRow(value, rowMenu.index + 1), closeRowMenu)}>
            Insert row below
          </MenuItem>
          <MenuItem disabled={rowMenu.index === 0} onClick={() => act(moveRow(value, rowMenu.index, rowMenu.index - 1), closeRowMenu)}>
            Move up
          </MenuItem>
          <MenuItem disabled={rowMenu.index === rowCount - 1} onClick={() => act(moveRow(value, rowMenu.index, rowMenu.index + 1), closeRowMenu)}>
            Move down
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => act(removeRow(value, rowMenu.index), closeRowMenu)}>Delete row</MenuItem>
        </Menu>
      )}
    </Stack>
  );
}

type ColumnSettingsProps = {
  anchor: HTMLElement;
  index: number;
  value: TableCells;
  onChange: (value: TableCells) => void;
  /** Apply a structural change and close the popover. */
  act: (value: TableCells) => void;
  onClose: () => void;
};

/** A column's alignment and width, and the actions that insert, move or delete it. */
function ColumnSettings({ anchor, index, value, onChange, act, onClose }: ColumnSettingsProps) {
  const column = value.columns[index];
  const columnCount = value.columns.length;
  const [width, setWidth] = useState(column?.width ? String(column.width) : '');

  const onWidthChange = (text: string) => {
    setWidth(text);
    const n = Number(text);
    if (text.trim() === '') {
      onChange(setColumn(value, index, { width: null }));
    } else if (Number.isFinite(n) && n >= 1 && n <= 100) {
      onChange(setColumn(value, index, { width: Math.round(n) }));
    }
  };

  return (
    <Popover
      open
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <Stack spacing={2} sx={{ p: 2, width: 232 }}>
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
          Column {index + 1}
        </Typography>
        <Stack alignItems="flex-start">
          <InputLabel shrink>Alignment</InputLabel>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={column?.align ?? 'left'}
            onChange={(_, align: TableAlign | null) => align && onChange(setColumn(value, index, { align }))}
          >
            <ToggleButton value="left" aria-label="Align left">
              <FormatAlignLeftOutlined fontSize="small" />
            </ToggleButton>
            <ToggleButton value="center" aria-label="Align centre">
              <FormatAlignCenterOutlined fontSize="small" />
            </ToggleButton>
            <ToggleButton value="right" aria-label="Align right">
              <FormatAlignRightOutlined fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <TextField
          label="Width"
          variant="standard"
          placeholder="Auto"
          value={width}
          onChange={(event) => onWidthChange(event.target.value)}
          helperText="Share of the table. Leave empty to fit the content."
          inputProps={{ inputMode: 'numeric' }}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
        />
      </Stack>
      <Divider />
      <MenuList dense>
        <MenuItem disabled={columnCount >= MAX_TABLE_COLUMNS} onClick={() => act(insertColumn(value, index))}>
          Insert column left
        </MenuItem>
        <MenuItem disabled={columnCount >= MAX_TABLE_COLUMNS} onClick={() => act(insertColumn(value, index + 1))}>
          Insert column right
        </MenuItem>
        <MenuItem disabled={index === 0} onClick={() => act(moveColumn(value, index, index - 1))}>
          Move left
        </MenuItem>
        <MenuItem disabled={index === columnCount - 1} onClick={() => act(moveColumn(value, index, index + 1))}>
          Move right
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => act(removeColumn(value, index))}>Delete column</MenuItem>
      </MenuList>
    </Popover>
  );
}
