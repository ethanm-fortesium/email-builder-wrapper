import { z } from 'zod';

export const TABLE_BORDER_STYLES = ['none', 'rows', 'framed', 'grid'] as const;
export type TableBorderStyle = (typeof TABLE_BORDER_STYLES)[number];

const AlignSchema = z.enum(['left', 'center', 'right']);
export type TableAlign = z.infer<typeof AlignSchema>;

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
  })
  .optional()
  .nullable();

const ColumnSchema = z.object({
  align: AlignSchema.optional().nullable(),
  /** Share of the table width in %; empty: sized to the column's content. */
  width: z.number().min(1).max(100).optional().nullable(),
});
export type TableColumn = z.infer<typeof ColumnSchema>;

const TablePropsSchema = z.object({
  style: StyleSchema,
  props: z
    .object({
      /** Cell text by row. Rows may differ in length: shorter rows are padded with empty cells. */
      rows: z.array(z.array(z.string())).optional().nullable(),
      /** Per-column settings, by column index. */
      columns: z.array(ColumnSchema.nullable()).optional().nullable(),
      /** The first row is a header row. */
      headerRow: z.boolean().optional().nullable(),
      /** The first column is a header column (labels of a key/value table). */
      headerColumn: z.boolean().optional().nullable(),
      /** Cells are inline markdown (bold, italic, links, code) instead of plain text. */
      markdown: z.boolean().optional().nullable(),
      borderStyle: z.enum(TABLE_BORDER_STYLES).optional().nullable(),
      borderColor: z.string().optional().nullable(),
      headerBackgroundColor: z.string().optional().nullable(),
      headerTextColor: z.string().optional().nullable(),
      /** Background of every second body row. */
      stripeColor: z.string().optional().nullable(),
      cellPadding: z
        .object({
          vertical: z.number().int().min(0).max(48),
          horizontal: z.number().int().min(0).max(48),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
});

export const TablePropsDefaults = {
  headerRow: true,
  headerColumn: false,
  markdown: false,
  borderStyle: 'rows' as TableBorderStyle,
  borderColor: '#E4E7EC',
  cellPadding: { vertical: 8, horizontal: 12 },
};

/** Most columns the editor lets a table have (wider tables do not fit a phone or a 600px canvas). */
export const MAX_TABLE_COLUMNS = 8;
/** Most rows the editor lets a table have. */
export const MAX_TABLE_ROWS = 100;

export type TableProps = z.infer<typeof TablePropsSchema>;
export default TablePropsSchema;
