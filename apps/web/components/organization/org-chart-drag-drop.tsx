'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { OrgChartNode as OrgChartNodeData } from '@/lib/types/employee';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TreeNode {
  id: string;
  label: string;
  type: 'department' | 'position' | 'employee';
  headName?: string;
  vacant?: boolean;
  positionTitle?: string;
  children?: TreeNode[];
  depth: number;
  expanded: boolean;
  parentId?: string;
}

interface DragDropOrgChartProps {
  root: TreeNode;
  onMove?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => Promise<void>;
  onToggleExpand?: (id: string) => void;
  expandedIds?: Set<string>;
  searchQuery?: string;
}

function flattenTree(
  nodes: TreeNode[],
  parentId: string | null = null,
  depth = 0,
  expandedIds: Set<string> = new Set(),
  searchQuery: string = ''
): Array<{ node: TreeNode; depth: number; parentId: string | null; visible: boolean }> {
  const result: Array<{ node: TreeNode; depth: number; parentId: string | null; visible: boolean }> = [];
  const query = searchQuery.trim().toLowerCase();

  function walk(nodes: TreeNode[], currentParentId: string | null, currentDepth: number) {
    for (const node of nodes) {
      const matchesSearch = !searchQuery || node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.headName?.toLowerCase().includes(searchQuery.toLowerCase());
      const shouldShow = matchesSearch || (searchQuery && node.children?.some(c => c.label.toLowerCase().includes(searchQuery.toLowerCase())));

      if (shouldShow || !searchQuery) {
        result.push({
          node,
          depth: currentDepth,
          parentId: currentParentId,
          visible: true,
        });
      }

      if (node.expanded && node.children && node.children.length > 0) {
        for (const child of node.children) {
          walk([child], node.id, currentDepth + 1);
        }
      }
    }
  }

  walk(nodes, parentId, depth);
  return result;
}

interface SortableTreeNodeProps {
  item: { node: TreeNode; depth: number; parentId: string | null; visible: boolean };
  index: number;
  items: Array<{ node: TreeNode; depth: number; parentId: string | null; visible: boolean }>;
  onToggleExpand?: (id: string) => void;
  expandedIds: Set<string>;
  searchQuery: string;
}

function SortableTreeNode({
  item,
  index,
  items,
  onToggleExpand,
  expandedIds,
  searchQuery,
}: {
  item: { node: TreeNode; depth: number; parentId: string | null; visible: boolean };
  index: number;
  items: Array<{ node: TreeNode; depth: number; parentId: string | null; visible: boolean }>;
  onToggleExpand?: (id: string) => void;
  expandedIds: Set<string>;
  searchQuery: string;
}) {
  const { node, depth, parentId, visible } = item;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const matchesSearch = !searchQuery || node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.headName?.toLowerCase().includes(searchQuery.toLowerCase());

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeColors: Record<string, string> = {
    department: 'border-indigo-500 bg-indigo-50',
    position: 'border-sky-500 bg-sky-50',
    employee: 'border-emerald-500 bg-emerald-50',
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div {...attributes} {...listeners} className={cn(
        'flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50',
        typeColors[node.type] || 'border-gray-200 bg-gray-50',
        !visible && 'opacity-30',
        isDragging && 'shadow-lg ring-2 ring-primary'
      )} style={{ marginLeft: depth * 24 }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand?.(node.id); }}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-black/5"
              aria-label={isExpanded ? 'Tutup' : 'Buka'}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{node.label}</p>
            {node.headName && <p className="text-xs text-muted-foreground">{node.headName}</p>}
            {node.vacant && <p className="text-xs text-destructive">Kosong</p>}
          </div>
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border"
            style={{ backgroundColor: node.type === 'department' ? '#eef2ff' : node.type === 'position' ? '#f0f9ff' : '#ecfdf5',
              color: node.type === 'department' ? '#6366f1' : node.type === 'position' ? '#0ea5e9' : '#10b981',
              borderColor: node.type === 'department' ? '#c7d2fe' : node.type === 'position' ? '#bae6fd' : '#a7f3d0' }}>
            {node.type === 'department' ? 'Dept' : node.type === 'position' ? 'Pos' : 'Emp'}
          </span>
          <span className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab h-5 w-5 flex-shrink-0" aria-label="Seret untuk memindahkan">☰</span>
        </div>
      </div>
    </div>
  );
}

interface DragDropOrgChartProps {
  root: TreeNode;
  onMove?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => Promise<void>;
  onToggleExpand?: (id: string) => void;
  expandedIds?: Set<string>;
  searchQuery?: string;
}

function DragDropOrgChart({
  root,
  onMove,
  onToggleExpand,
  expandedIds = new Set(),
  searchQuery = '',
}: DragDropOrgChartProps) {
  const [items, setItems] = useState<Array<{ node: TreeNode; depth: number; parentId: string | null; visible: boolean }>>([]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeIndex = items.findIndex(item => item.node.id === active.id);
    const overIndex = items.findIndex(item => item.node.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    const newItems = arrayMove(items, activeIndex, overIndex);
    setItems(newItems);

    if (onMove) {
      await onMove(String(active.id), String(over.id), activeIndex < overIndex ? 'after' : 'before');
    }
  }, [items, onMove]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const flattenedItems = useMemo(() => flattenTree([root], null, 0, expandedIds, searchQuery), [root, expandedIds, searchQuery]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.node.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {flattenedItems.map((item, index) => (
            <SortableTreeNode
              key={item.node.id}
              item={item}
              index={index}
              items={items}
              onToggleExpand={onToggleExpand}
              expandedIds={expandedIds}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default DragDropOrgChart;