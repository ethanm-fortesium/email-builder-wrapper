import React, { useEffect, useRef, useState } from 'react';
import 'quill/dist/quill.snow.css';
import { ZodError } from 'zod';
import DOMPurify from 'dompurify';
import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel.js';
import RichTextPropsSchema, { RichTextProps } from '../../../../documents/blocks/RichText/RichTextPropsSchema.js';
import { FONT_FAMILIES } from '../../../../documents/blocks/helpers/fontFamily.js';
import { Box, IconButton, Tooltip, TextField, Button, Paper, Menu } from '@mui/material';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatListBulleted,
    FormatListNumbered,
    FormatClear,
    Link as LinkIcon,
    HighlightAlt,
    ColorLens,
} from '@mui/icons-material';
import Picker from './helpers/inputs/ColorInput/Picker.js';

const sanitizeHtml = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

type Props = { data: RichTextProps; setData: (v: RichTextProps) => void };
export default function RichTextSidebarPanel({ data, setData }: Props) {
    const [errors, setErrors] = useState<ZodError | null>(null);
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const currentHtml = data.props?.html || data.props?.initial || '';
    const [linkAnchor, setLinkAnchor] = useState<null | HTMLElement>(null);
    const [linkValue, setLinkValue] = useState('');
    const [linkError, setLinkError] = useState<string | null>(null);
    const [linkSelection, setLinkSelection] = useState<{ index: number; length: number } | null>(null);
    const [activeFormats, setActiveFormats] = useState<Record<string, any>>({});
    const latestDataRef = useRef<RichTextProps>(data);

    useEffect(() => {
        latestDataRef.current = data;
    }, [data]);

    const updateData = (d: unknown) => {
        const res = RichTextPropsSchema.safeParse(d);
        if (res.success) {
            setData(res.data);
            setErrors(null);
        } else {
            setErrors(res.error);
        }
    };

    const toUrlVariants = (raw: string) => {
        const trimmed = raw.trim();
        const normalized = trimmed ? (/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`) : '';
        return { trimmed, normalized };
    };

    const validateUrl = (raw: string): string | null => {
        const { trimmed, normalized } = toUrlVariants(raw);
        if (!trimmed) return 'Enter a URL';
        try {
            const parsed = new URL(normalized);
            if (!['http:', 'https:'].includes(parsed.protocol)) return 'Use http or https links only';
            const host = parsed.hostname;
            if (!host) return 'URL must include a host';
            if (!host.includes('.')) return 'Domain must contain a dot (example.com)';
            const tld = host.split('.').pop() || '';
            if (tld.length < 2 || tld.length > 24 || !/^[a-z]+$/i.test(tld)) return 'Domain must end with letters';
            return null;
        } catch {
            return 'URL is not valid';
        }
    };

    const normalizeUrl = (raw: string): string => {
        const { normalized } = toUrlVariants(raw);
        return normalized;
    };

    const applyBlockStyles = (quill: any, style: any) => {
        if (!quill) return;
        const root: HTMLElement = quill.root;
        if (!root) return;
        const resolvedFont = style?.fontFamily ? (FONT_FAMILIES.find(f => f.key === style.fontFamily)?.value || style.fontFamily) : '';
        const fontSizeValue = typeof style?.fontSize === 'number' ? `${style.fontSize}px` : style?.fontSize || '';
        if (style?.color) root.style.color = style.color; else root.style.removeProperty('color');
        if (style?.backgroundColor) root.style.backgroundColor = style.backgroundColor; else root.style.removeProperty('background-color');
        if (resolvedFont) root.style.fontFamily = resolvedFont; else root.style.removeProperty('font-family');
        if (fontSizeValue) root.style.fontSize = fontSizeValue; else root.style.removeProperty('font-size');
        if (style?.textAlign) root.style.textAlign = style.textAlign as any; else root.style.removeProperty('text-align');
    };

    useEffect(() => {
        let disposed = false;
        (async () => {
            const { default: Quill } = await import('quill');
            if (disposed) return;
            const el = containerRef.current;
            if (!el) return;
            el.innerHTML = '';
            const editorDiv = document.createElement('div');
            editorDiv.style.minHeight = '160px';
            editorDiv.style.fontSize = '14px';
            el.appendChild(editorDiv);
            const quill = new Quill(editorDiv, {
                theme: 'snow',
                modules: { toolbar: false },
                placeholder: 'Start typing…',
            });
            editorRef.current = quill;
            const delta = quill.clipboard.convert(currentHtml);
            quill.setContents(delta);
            applyBlockStyles(quill, latestDataRef.current?.style || {});
            quill.on('text-change', () => {
                const html = sanitizeHtml(quill.root.innerHTML);
                const latest = latestDataRef.current || {};
                updateData({ ...latest, props: { ...(latest.props || {}), html } });
            });
            quill.on('selection-change', (range: any) => {
                if (range) {
                    try {
                        const fmts = quill.getFormat(range.index, range.length);
                        setActiveFormats(fmts);
                        if (linkAnchor && range.length > 0) {
                            setLinkSelection({ index: range.index, length: range.length });
                            setLinkValue(fmts.link || '');
                            setLinkError(null);
                        }
                    } catch {
                        setActiveFormats({});
                    }
                } else {
                    setActiveFormats({});
                }
            });
        })();
        return () => { disposed = true; editorRef.current = null; };
    }, []); 

    const refreshActive = () => {
        if (!editorRef.current) return;
        const sel = editorRef.current.getSelection();
        if (sel) {
            try {
                setActiveFormats(editorRef.current.getFormat(sel.index, sel.length));
            } catch { setActiveFormats({}); }
        }
    };

    const cleanupBlockStyleOverlap = () => {
        if (!editorRef.current) return;
        const root: HTMLElement = editorRef.current.root;
        const block = (latestDataRef.current?.style || {}) as any;
        const rootStyles = {
            color: root.style.color,
            backgroundColor: root.style.backgroundColor,
            fontFamily: root.style.fontFamily,
            fontSize: root.style.fontSize,
            textAlign: root.style.textAlign,
        };
        root.querySelectorAll('[style]').forEach(node => {
            const el = node as HTMLElement;
            if (el === root) return;
            const style = el.style;
            const matchesColor = block.color && style.color && style.color === rootStyles.color;
            const matchesBg = block.backgroundColor && style.backgroundColor && style.backgroundColor === rootStyles.backgroundColor;
            const matchesFont = block.fontFamily && style.fontFamily && style.fontFamily === rootStyles.fontFamily;
            const matchesSize = block.fontSize && style.fontSize && style.fontSize === rootStyles.fontSize;
            const matchesAlign = block.textAlign && style.textAlign && style.textAlign === rootStyles.textAlign;
            if (matchesColor) style.removeProperty('color');
            if (matchesBg) style.removeProperty('background-color');
            if (matchesFont) style.removeProperty('font-family');
            if (matchesSize) style.removeProperty('font-size');
            if (matchesAlign) style.removeProperty('text-align');
            if (!style.cssText.trim()) el.removeAttribute('style');
        });
    };

    const [colorAnchor, setColorAnchor] = useState<null | HTMLElement>(null);
    const [bgAnchor, setBgAnchor] = useState<null | HTMLElement>(null);

    useEffect(() => {
        if (editorRef.current) {
            applyBlockStyles(editorRef.current, data.style || {});
            cleanupBlockStyleOverlap();
        }
    }, [data.style]);

    const perform = (action: string, value?: any) => {
        if (!editorRef.current) return;
        if (action === 'clear-selection') {
            const sel = editorRef.current.getSelection();
            if (sel && sel.length) editorRef.current.removeFormat(sel.index, sel.length);
            applyBlockStyles(editorRef.current, latestDataRef.current?.style || {});
            cleanupBlockStyleOverlap();
            refreshActive();
            return;
        }
        if (['bold', 'italic', 'underline'].includes(action)) {
            const current = editorRef.current.getFormat();
            const active = current[action];
            editorRef.current.format(action, !active);
            applyBlockStyles(editorRef.current, latestDataRef.current?.style || {});
            cleanupBlockStyleOverlap();
            refreshActive();
            return;
        }
        if (action === 'color') {
            editorRef.current.format('color', value);
            applyBlockStyles(editorRef.current, latestDataRef.current?.style || {});
            refreshActive();
            return;
        }
        if (action === 'background') {
            editorRef.current.format('background', value);
            applyBlockStyles(editorRef.current, latestDataRef.current?.style || {});
            refreshActive();
            return;
        }
        if (action === 'list-bullet') {
            const current = editorRef.current.getFormat();
            editorRef.current.format('list', current.list === 'bullet' ? false : 'bullet');
            applyBlockStyles(editorRef.current, latestDataRef.current?.style || {});
            cleanupBlockStyleOverlap();
            refreshActive();
            return;
        }
        if (action === 'list-ordered') {
            const current = editorRef.current.getFormat();
            editorRef.current.format('list', current.list === 'ordered' ? false : 'ordered');
            applyBlockStyles(editorRef.current, latestDataRef.current?.style || {});
            cleanupBlockStyleOverlap();
            refreshActive();
            return;
        }
        editorRef.current.format(action, value || true);
        applyBlockStyles(editorRef.current, latestDataRef.current?.style || {});
        cleanupBlockStyleOverlap();
        refreshActive();
    };

    return (
        <BaseSidebarPanel title="Rich Text block">
            {errors && (
                <Box sx={{ border: '1px solid', borderColor: 'error.main', p: 1, mb: 1.5, fontSize: 12, color: 'error.dark' }}>
                    {errors.issues.map((issue, i) => (
                        <div key={i}>{issue.path.join('.')}: {issue.message}</div>
                    ))}
                </Box>
            )}
            <Paper elevation={0} sx={{ display: 'flex', flexWrap: 'inherit', gap: 0.01, mb: 0.5, p: 0.2, background: 'rgba(0,0,0,0.03)', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Tooltip title="Bold"><IconButton size="small" color={activeFormats.bold ? 'primary' : 'default'} onClick={() => perform('bold')}><FormatBold fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Italic"><IconButton size="small" color={activeFormats.italic ? 'primary' : 'default'} onClick={() => perform('italic')}><FormatItalic fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Underline"><IconButton size="small" color={activeFormats.underline ? 'primary' : 'default'} onClick={() => perform('underline')}><FormatUnderlined fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Link">
                    <IconButton
                        size="small"
                        color={activeFormats.link ? 'primary' : 'default'}
                        onMouseDown={(e) => {
                            // capture selection before focus shifts
                            const sel = editorRef.current?.getSelection();
                            if (!sel || sel.length === 0) return; // need highlighted text
                            const currentFormat = editorRef.current.getFormat(sel.index, sel.length);
                            const currentLink = currentFormat.link || '';
                            setLinkValue(currentLink);
                            setLinkError(currentLink ? validateUrl(currentLink) : 'Enter a URL');
                            setLinkSelection({ index: sel.index, length: sel.length });
                            setLinkAnchor(e.currentTarget);
                        }}
                    >
                        <LinkIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Text color">
                        <IconButton size="small" onClick={(e) => setColorAnchor(e.currentTarget)} color={activeFormats.color ? 'primary' : 'default'}>
                            <ColorLens fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Highlight">
                        <IconButton size="small" onClick={(e) => setBgAnchor(e.currentTarget)} color={activeFormats.background ? 'primary' : 'default'}>
                            <HighlightAlt fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Menu
                        anchorEl={colorAnchor}
                        open={Boolean(colorAnchor)}
                        onClose={() => setColorAnchor(null)}
                        MenuListProps={{ sx: { p: 0 } }}
                    >
                        <Picker
                            value={activeFormats.color || (data.style as any)?.color || '#000000'}
                            onChange={(v) => {
                                perform('color', v);
                            }}
                        />
                    </Menu>
                    <Menu
                        anchorEl={bgAnchor}
                        open={Boolean(bgAnchor)}
                        onClose={() => setBgAnchor(null)}
                        MenuListProps={{ sx: { p: 0 } }}
                    >
                        <Picker
                            value={activeFormats.background || (data.style as any)?.backgroundColor || '#ffff00'}
                            onChange={(v) => {
                                perform('background', v);
                            }}
                        />
                    </Menu>
                </Box>
                <Tooltip title="Bullet list"><IconButton size="small" color={activeFormats.list === 'bullet' ? 'primary' : 'default'} onClick={() => perform('list-bullet')}><FormatListBulleted fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Ordered list"><IconButton size="small" color={activeFormats.list === 'ordered' ? 'primary' : 'default'} onClick={() => perform('list-ordered')}><FormatListNumbered fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Clear selection formatting"><IconButton size="small" onClick={() => perform('clear-selection')}><FormatClear fontSize="small" /></IconButton></Tooltip>
                <Menu
                    anchorEl={linkAnchor}
                    open={Boolean(linkAnchor) && !!linkSelection}
                    slotProps={{ paper: { sx: { border: '1px solid', borderColor: 'divider', boxShadow: 'none' } } }}
                    MenuListProps={{ sx: { p: 1 } }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: 260 }}>
                        <TextField
                            size="small"
                            label="Link URL"
                            value={linkValue}
                            onChange={(e) => {
                                const value = e.target.value;
                                setLinkValue(value);
                                setLinkError(value ? validateUrl(value) : 'Enter a URL');
                            }}
                            autoFocus
                            error={Boolean(linkError)}
                            helperText={linkError || 'Example: example.com or https://example.com'}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setLinkAnchor(null);
                                }
                                if (e.key === 'Enter') {
                                    if (linkSelection) {
                                        const { index, length } = linkSelection;
                                        const normalized = normalizeUrl(linkValue);
                                        if (!normalized) {
                                            setLinkError('Enter a URL');
                                            return;
                                        }
                                        const err = validateUrl(linkValue);
                                        if (err) {
                                            setLinkError(err);
                                            return;
                                        }
                                        editorRef.current.formatText(index, length, 'link', normalized);
                                    }
                                    setLinkAnchor(null);
                                    refreshActive();
                                }
                            }}
                        />
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <Button size="small" variant="outlined" color="warning" onClick={() => {
                                if (linkSelection) {
                                    const { index, length } = linkSelection;
                                    editorRef.current.formatText(index, length, 'link', false);
                                }
                                setLinkAnchor(null);
                                refreshActive();
                                setLinkError(null);
                            }}>Remove</Button>
                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                <Button size="small" variant="outlined" onClick={() => { setLinkAnchor(null); setLinkError(null); }}>Cancel</Button>
                                <Button size="small" variant="contained" onClick={() => {
                                    if (linkSelection) {
                                        const err = validateUrl(linkValue);
                                        if (err) {
                                            setLinkError(err);
                                            return;
                                        }
                                        const { index, length } = linkSelection;
                                        const normalized = normalizeUrl(linkValue);
                                        editorRef.current.formatText(index, length, 'link', normalized || false);
                                    }
                                    setLinkAnchor(null);
                                    setLinkError(null);
                                    refreshActive();
                                }} disabled={Boolean(linkError)}>Save</Button>
                            </Box>
                        </Box>
                    </Box>
                </Menu>
            </Paper>
            <Box sx={{ 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 1, 
                background: '#fff', 
                position: 'relative', 
                '& .ql-container': { border: 'none !important' }, 
                '& .ql-editor': { border: 'none !important', minHeight: '160px' },
                '& .ql-clipboard': { position: 'absolute !important', top: '0 !important', width: '1px !important', height: '1px !important', overflow: 'hidden !important', opacity: 0 }
            }}
                style={{ marginTop: 0, padding: 10 }}>
                <div ref={containerRef} />
            </Box>
            <MultiStylePropertyPanel
                names={['color', 'backgroundColor', 'fontFamily', 'fontSize', 'textAlign', 'padding']}
                value={data.style}
                onChange={(style) => updateData({ ...data, style })}
            />    
            
        </BaseSidebarPanel>
    );
}
