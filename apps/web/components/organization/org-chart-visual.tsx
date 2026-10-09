'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { OrgChartNode as OrgChartNodeData } from '@/lib/types/employee';
import { ZoomIn, ZoomOut, Maximize, Download, Search } from 'lucide-react';

const NODE_W = 232;
const NODE_H = 78;
const H_GAP = 28;
const V_GAP = 72;

interface PlacedNode {
  data: OrgChartNodeData;
  x: number;
  y: number;
  depth: number;
  collapsed: boolean;
  headcount: number;
  children: PlacedNode[];
}

interface Props {
  root: OrgChartNodeData;
  onSelect?: (node: OrgChartNodeData, depth: number) => void;
}

function countEmployees(node: OrgChartNodeData): number {
  let n = node.type === 'employee' ? 1 : 0;
  for (const c of node.children ?? []) n += countEmployees(c);
  return n;
}

/** Tidy tree layout: subtree width = max(node width, sum of children widths). */
function layout(node: OrgChartNodeData, depth: number, collapsed: Set<string>, xOffset: number): { placed: PlacedNode; width: number } {
  const isCollapsed = collapsed.has(node.id);
  const kids = isCollapsed ? [] : (node.children ?? []);
  const childLayouts = kids.map((c) => layout(c, depth + 1, collapsed, 0));
  const childrenWidth = childLayouts.reduce((s, l) => s + l.width, 0) + Math.max(0, childLayouts.length - 1) * H_GAP;
  const width = Math.max(NODE_W, childrenWidth);
  let cx = xOffset;
  const placedChildren: PlacedNode[] = [];
  for (const l of childLayouts) {
    const shifted = shift(l.placed, cx);
    placedChildren.push(shifted);
    cx += l.width + H_GAP;
  }
  // Center parent over children
  const nodeX = xOffset + (width - NODE_W) / 2;
  return {
    placed: {
      data: node,
      x: nodeX,
      y: depth * (NODE_H + V_GAP),
      depth,
      collapsed: isCollapsed,
      headcount: countEmployees(node),
      children: placedChildren,
    },
    width,
  };
}

function shift(p: PlacedNode, dx: number): PlacedNode {
  return { ...p, x: p.x + dx, children: p.children.map((c) => shift(c, dx)) };
}

function collectPaths(node: OrgChartNodeData, query: string, path: string[] = []): string[][] {
  const q = query.trim().toLowerCase();
  const hits: string[][] = [];
  if (q && (`${node.label} ${node.headName ?? ''}`.toLowerCase().includes(q))) {
    hits.push([...path, node.id]);
  }
  for (const c of node.children ?? []) {
    hits.push(...collectPaths(c, query, [...path, node.id]));
  }
  return hits;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

const TYPE_STYLE: Record<string, { stroke: string; fill: string; badge: string }> = {
  department: { stroke: '#6366f1', fill: '#eef2ff', badge: 'Dept' },
  position: { stroke: '#0ea5e9', fill: '#f0f9ff', badge: 'Posisi' },
  employee: { stroke: '#10b981', fill: '#ecfdf5', badge: 'Karyawan' },
};

export default function OrgChartVisual({ root, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const matchIds = useMemo(() => {
    if (!query.trim()) return new Set<string>();
    const paths = collectPaths(root, query);
    return new Set(paths.flat());
  }, [root, query]);

  // Auto-expand ancestors of matches
  const effectiveCollapsed = useMemo(() => {
    if (matchIds.size === 0) return collapsed;
    const next = new Set(collapsed);
    // Expand every ancestor on any match path (all ids except the leaf itself)
    const paths = collectPaths(root, query);
    for (const p of paths) for (const id of p.slice(0, -1)) next.delete(id);
    return next;
  }, [collapsed, matchIds, root, query]);

  const { placed, width } = useMemo(() => layout(root, 0, effectiveCollapsed, 0), [root, effectiveCollapsed]);
  const height = useMemo(() => {
    let maxY = 0;
    const walk = (p: PlacedNode) => {
      maxY = Math.max(maxY, p.y + NODE_H);
      p.children.forEach(walk);
    };
    walk(placed);
    return maxY;
  }, [placed]);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => {
    const all = new Set<string>();
    const walk = (n: OrgChartNodeData) => {
      if ((n.children ?? []).length > 0) all.add(n.id);
      (n.children ?? []).forEach(walk);
    };
    walk(root);
    setCollapsed(all);
  }, [root]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 24, y: 24 });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.3, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.sx), y: d.py + (e.clientY - d.sy) });
  }, []);

  const endDrag = useCallback(() => { dragRef.current = null; }, []);

  const downloadSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(width + 48));
    clone.setAttribute('height', String(height + 48));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'struktur-organisasi.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, [width, height]);

  const nodes: PlacedNode[] = [];
  const edges: { x1: number; y1: number; x2: number; y2: number; midY: number }[] = [];
  const walk = (p: PlacedNode) => {
    nodes.push(p);
    for (const c of p.children) {
      edges.push({
        x1: p.x + NODE_W / 2, y1: p.y + NODE_H,
        x2: c.x + NODE_W / 2, y2: c.y,
        midY: p.y + NODE_H + V_GAP / 2,
      });
      walk(c);
    }
  };
  walk(placed);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari unit / nama pimpinan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            aria-label="Cari struktur organisasi"
          />
        </div>
        {query.trim() && (
          <Badge variant="secondary">{matchIds.size} cocok</Badge>
        )}
        <Button variant="outline" size="sm" onClick={expandAll}>Buka semua</Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>Tutup semua</Button>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))} aria-label="Perbesar">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.3, z * 0.85))} aria-label="Perkecil">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={resetView} aria-label="Atur ulang tampilan">
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={downloadSvg} aria-label="Unduh SVG">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-lg border bg-muted/20"
        style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        <svg
          ref={svgRef}
          width="100%"
          height={520}
          onWheel={onWheel}
          role="img"
          aria-label="Bagan struktur organisasi"
        >
          <defs>
            <pattern id="orgchart-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.12" />
            </pattern>
          </defs>
          <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#orgchart-grid)" className="text-muted-foreground" />
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {edges.map((e, i) => (
              <path
                key={i}
                d={`M ${e.x1} ${e.y1} V ${e.midY} H ${e.x2} V ${e.y2}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                className="text-muted-foreground/70"
              />
            ))}
            {nodes.map((p) => {
              const st = TYPE_STYLE[p.data.type] ?? TYPE_STYLE.department;
              const matched = matchIds.has(p.data.id);
              const isSelected = selectedId === p.data.id;
              return (
                <g key={p.data.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(p.data.id);
                    onSelect?.(p.data, p.depth);
                  }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={12}
                    fill={p.data.vacant ? '#fef2f2' : st.fill}
                    stroke={matched || isSelected ? '#f59e0b' : st.stroke}
                    strokeWidth={matched || isSelected ? 3 : 1.8}
                    strokeDasharray={p.data.vacant ? '7 5' : undefined}
                  />
                  <rect x={10} y={10} width={34} height={34} rx={8} fill={st.stroke} opacity={0.14} />
                  <text x={27} y={33} textAnchor="middle" fontSize={15} fontWeight={700} fill={st.stroke}>
                    {p.data.type === 'department' ? '🏢' : p.data.type === 'position' ? '💼' : '👤'}
                  </text>
                  <text x={52} y={26} fontSize={12.5} fontWeight={700} fill="#0f172a" className="dark:fill-slate-100">
                    {truncate(p.data.label, 26)}
                  </text>
                  <text x={52} y={43} fontSize={11} fill="#64748b">
                    {truncate(p.data.headName || p.data.positionTitle || st.badge, 30)}
                  </text>
                  <text x={52} y={60} fontSize={10.5} fontWeight={600} fill={st.stroke}>
                    {p.data.vacant ? '⚠ Kosong' : `👥 ${p.headcount} orang`}
                    {p.data.children && p.data.children.length > 0 ? `  •  ${p.collapsed ? '+' : '−'}${p.data.children.length}` : ''}
                  </text>
                  {(p.data.children ?? []).length > 0 && (
                    <g
                      transform={`translate(${NODE_W / 2 - 11},${NODE_H - 11})`}
                      onClick={(e) => { e.stopPropagation(); toggle(p.data.id); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect width={22} height={22} rx={11} fill="#fff" stroke={st.stroke} strokeWidth={1.5} />
                      <text x={11} y={16} textAnchor="middle" fontSize={14} fontWeight={700} fill={st.stroke}>
                        {p.collapsed ? '+' : '−'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#6366f1' }} /> Departemen</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#0ea5e9' }} /> Posisi</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#10b981' }} /> Karyawan</span>
        <span className="ml-auto">Geser untuk pan • scroll untuk zoom • klik node untuk detail</span>
      </div>
    </div>
  );
}
