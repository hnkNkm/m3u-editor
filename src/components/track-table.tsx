import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Trash2, GripVertical, ArrowUp, ArrowDown, Copy, ClipboardPaste, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Track } from "@/stores/playlist";
import { usePlaylistStore } from "@/stores/playlist";

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? null : n;
}

function EditableCell({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <span
        className={`cursor-pointer rounded px-1 hover:bg-muted ${className ?? ""}`}
        onDoubleClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {value || "—"}
      </span>
    );
  }

  function commit() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }

  return (
    <input
      ref={inputRef}
      className="w-full rounded border border-input bg-background px-1 text-sm outline-none focus:ring-1 focus:ring-ring"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

function SortableRow({
  track,
  index,
  selected,
  duplicate,
  missing,
  onSelect,
  onUpdate,
  onRemove,
  onContextMenu,
  id,
}: {
  track: Track;
  index: number;
  selected: boolean;
  duplicate: boolean;
  missing: boolean;
  onSelect: (index: number, shiftKey: boolean) => void;
  onUpdate: (index: number, field: keyof Track, value: string) => void;
  onRemove: (index: number) => void;
  onContextMenu: (index: number, x: number, y: number) => void;
  id: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-selected={selected || undefined}
      className={duplicate ? "bg-warning/10" : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(index, e.clientX, e.clientY);
      }}
    >
      <TableCell className="px-1 w-8">
        <button
          className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="px-1 w-8">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(index, e.nativeEvent instanceof MouseEvent && (e.nativeEvent as MouseEvent).shiftKey)}
          className="h-3.5 w-3.5 cursor-pointer accent-primary"
        />
      </TableCell>
      <TableCell className="text-center text-muted-foreground w-12">
        {index + 1}
      </TableCell>
      <TableCell>
        <EditableCell
          value={track.title ?? ""}
          onCommit={(v) => onUpdate(index, "title", v)}
        />
      </TableCell>
      <TableCell>
        <EditableCell
          value={track.artist ?? ""}
          onCommit={(v) => onUpdate(index, "artist", v)}
        />
      </TableCell>
      <TableCell className="text-right w-24">
        <EditableCell
          value={formatDuration(track.duration)}
          onCommit={(v) => onUpdate(index, "duration", v)}
          className="text-right"
        />
      </TableCell>
      <TableCell>
        <EditableCell
          value={track.path}
          onCommit={(v) => onUpdate(index, "path", v)}
          className={missing ? "text-destructive text-sm" : "text-muted-foreground text-sm"}
        />
        {missing && (
          <span className="text-[10px] text-destructive">File not found</span>
        )}
      </TableCell>
      <TableCell className="px-1 w-10">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface TrackTableProps {
  tracks: Track[];
  filteredIndices: number[] | null;
  missingPaths: Set<number>;
}

type SortKey = "title" | "artist" | "path";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </span>
    </TableHead>
  );
}

export function TrackTable({ tracks, filteredIndices, missingPaths }: TrackTableProps) {
  const { updateTrack, removeTrack, removeTracks, moveTrack, addTrack, sortTracks } = usePlaylistStore();
  const isFiltering = filteredIndices !== null;
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [lastSelected, setLastSelected] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [ctxMenu, setCtxMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  function handleSort(key: SortKey) {
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(newDir);
    sortTracks(key, newDir);
    setSelection(new Set());
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = tracks.map((_, i) => `track-${i}`);

  const visibleIndices = filteredIndices ?? tracks.map((_, i) => i);

  const handleSelect = useCallback(
    (index: number, shiftKey: boolean) => {
      setSelection((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastSelected !== null) {
          const start = Math.min(lastSelected, index);
          const end = Math.max(lastSelected, index);
          for (let i = start; i <= end; i++) {
            if (!isFiltering || visibleIndices.includes(i)) {
              next.add(i);
            }
          }
        } else if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
      setLastSelected(index);
    },
    [lastSelected, isFiltering, visibleIndices],
  );

  function handleSelectAll() {
    if (selection.size === visibleIndices.length) {
      setSelection(new Set());
    } else {
      setSelection(new Set(visibleIndices));
    }
  }

  function handleDeleteSelected() {
    const indices = Array.from(selection).sort((a, b) => b - a);
    if (indices.length === 0) return;
    removeTracks(indices);
    setSelection(new Set());
    setLastSelected(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from !== -1 && to !== -1) moveTrack(from, to);
  }

  function handleUpdate(index: number, field: keyof Track, value: string) {
    const track = { ...tracks[index] };
    if (field === "duration") {
      track.duration = parseDuration(value);
    } else {
      (track[field] as string | null) = value || null;
    }
    updateTrack(index, track);
  }

  function handleContextMenu(index: number, x: number, y: number) {
    setCtxMenu({ index, x, y });
  }

  useEffect(() => {
    if (!ctxMenu) return;
    function close(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    }
    function closeOnKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCtxMenu(null);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnKey);
    };
  }, [ctxMenu]);

  function ctxAction(fn: () => void) {
    fn();
    setCtxMenu(null);
  }

  const duplicateIndices = useMemo(() => {
    const pathCount = new Map<string, number[]>();
    tracks.forEach((t, i) => {
      if (!t.path) return;
      const key = t.path.toLowerCase();
      const list = pathCount.get(key);
      if (list) list.push(i);
      else pathCount.set(key, [i]);
    });
    const dupes = new Set<number>();
    for (const indices of pathCount.values()) {
      if (indices.length > 1) indices.forEach((i) => dupes.add(i));
    }
    return dupes;
  }, [tracks]);

  const allSelected = visibleIndices.length > 0 && selection.size === visibleIndices.length;
  const someSelected = selection.size > 0;

  return (
    <div className="flex-1 overflow-auto">
      {someSelected && (
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-1.5 text-sm">
          <span className="text-muted-foreground">
            {selection.size} selected
          </span>
          <Button variant="ghost" size="xs" onClick={handleDeleteSelected}>
            <Trash2 className="mr-1 h-3 w-3 text-destructive" />
            Delete
          </Button>
        </div>
      )}
      <DndContext
        sensors={isFiltering ? [] : sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-8 px-1">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={handleSelectAll}
                    className="h-3.5 w-3.5 cursor-pointer accent-primary"
                  />
                </TableHead>
                <TableHead className="w-12 text-center">#</TableHead>
                <SortableHeader label="Title" sortKey="title" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Artist" sortKey="artist" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <TableHead className="w-24 text-right">Duration</TableHead>
                <SortableHeader label="Path" sortKey="path" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleIndices.map((i) => (
                <SortableRow
                  key={ids[i]}
                  id={ids[i]}
                  track={tracks[i]}
                  index={i}
                  selected={selection.has(i)}
                  duplicate={duplicateIndices.has(i)}
                  missing={missingPaths.has(i)}
                  onSelect={handleSelect}
                  onUpdate={handleUpdate}
                  onRemove={removeTrack}
                  onContextMenu={handleContextMenu}
                />
              ))}
              {isFiltering && visibleIndices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No matching tracks
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="fixed z-50 min-w-[160px] rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <CtxItem
            onClick={() =>
              ctxAction(() => {
                const t = tracks[ctxMenu.index];
                addTrack({ ...t });
              })
            }
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Duplicate
          </CtxItem>
          <CtxItem
            onClick={() =>
              ctxAction(() =>
                addTrack({ path: "", title: null, artist: null, duration: null })
              )
            }
          >
            <ClipboardPaste className="mr-2 h-3.5 w-3.5" />
            Insert Track
          </CtxItem>
          {ctxMenu.index > 0 && (
            <CtxItem
              onClick={() =>
                ctxAction(() => moveTrack(ctxMenu.index, 0))
              }
            >
              <ArrowUpToLine className="mr-2 h-3.5 w-3.5" />
              Move to Top
            </CtxItem>
          )}
          {ctxMenu.index < tracks.length - 1 && (
            <CtxItem
              onClick={() =>
                ctxAction(() => moveTrack(ctxMenu.index, tracks.length - 1))
              }
            >
              <ArrowDownToLine className="mr-2 h-3.5 w-3.5" />
              Move to Bottom
            </CtxItem>
          )}
          <div className="-mx-1 my-1 h-px bg-border" />
          <CtxItem
            className="text-destructive"
            onClick={() =>
              ctxAction(() => {
                if (selection.size > 0 && selection.has(ctxMenu.index)) {
                  removeTracks(Array.from(selection));
                  setSelection(new Set());
                } else {
                  removeTrack(ctxMenu.index);
                }
              })
            }
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {selection.size > 0 && selection.has(ctxMenu.index)
              ? `Delete ${selection.size} Tracks`
              : "Delete"}
          </CtxItem>
        </div>
      )}
    </div>
  );
}

function CtxItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`flex w-full cursor-default items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${className ?? ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
