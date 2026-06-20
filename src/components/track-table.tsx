import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { Trash2, GripVertical, ArrowUp, ArrowDown, Copy, ClipboardPaste, ArrowUpToLine, ArrowDownToLine, Eye, EyeOff } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import type { Track } from "@/stores/playlist";
import { usePlaylistStore } from "@/stores/playlist";
import type { ColumnConfig, ColumnKey } from "@/hooks/use-column-settings";

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
  closeOnEscape = false,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    }
    window.addEventListener("mousedown", handleClick);
    if (!closeOnEscape) {
      return () => window.removeEventListener("mousedown", handleClick);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [ref, active, closeOnEscape]);
}

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
        className={`block cursor-pointer truncate rounded px-1 hover:bg-muted ${className ?? ""}`}
        onDoubleClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title={value || undefined}
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

function ResizeHandle({
  colKey,
  baseWidth,
  minWidth,
  onResizeEnd,
}: {
  colKey: string;
  baseWidth: number;
  minWidth: number;
  onResizeEnd: (width: number) => void;
}) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const col = document.querySelector(`col[data-col="${colKey}"]`) as HTMLElement | null;
      function onMouseMove(ev: MouseEvent) {
        const w = Math.max(minWidth, baseWidth + (ev.clientX - startX));
        if (col) col.style.width = `${w}px`;
      }
      function onMouseUp(ev: MouseEvent) {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        const finalW = Math.max(minWidth, baseWidth + (ev.clientX - startX));
        onResizeEnd(finalW);
      }
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [colKey, baseWidth, minWidth, onResizeEnd],
  );

  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50"
      onMouseDown={handleMouseDown}
    />
  );
}

const SortableRow = memo(
  function SortableRow({
    track,
    index,
    selected,
    duplicate,
    missing,
    visibleColumns,
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
    visibleColumns: ColumnKey[];
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
      <tr
        ref={setNodeRef}
        style={style}
        data-selected={selected || undefined}
        className={`border-b text-sm ${duplicate ? "bg-warning/10" : ""} ${selected ? "bg-accent/50" : ""}`}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(index, e.clientX, e.clientY);
        }}
      >
        <td className="px-1 w-8">
          <button
            className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
        <td className="px-1 w-8">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(index, e.nativeEvent instanceof MouseEvent && (e.nativeEvent as MouseEvent).shiftKey)}
            className="track-check"
          />
        </td>
        <td className="text-center text-muted-foreground w-10 px-1">
          {index + 1}
        </td>
        {visibleColumns.map((col) => {
          if (col === "title") {
            return (
              <td key="title" className="px-1 overflow-hidden">
                <EditableCell
                  value={track.title ?? ""}
                  onCommit={(v) => onUpdate(index, "title", v)}
                />
              </td>
            );
          }
          if (col === "artist") {
            return (
              <td key="artist" className="px-1 overflow-hidden">
                <EditableCell
                  value={track.artist ?? ""}
                  onCommit={(v) => onUpdate(index, "artist", v)}
                />
              </td>
            );
          }
          if (col === "duration") {
            return (
              <td key="duration" className="px-1 text-right overflow-hidden">
                <EditableCell
                  value={formatDuration(track.duration)}
                  onCommit={(v) => onUpdate(index, "duration", v)}
                  className="text-right"
                />
              </td>
            );
          }
          if (col === "path") {
            return (
              <td key="path" className="px-1 overflow-hidden">
                <EditableCell
                  value={track.path}
                  onCommit={(v) => onUpdate(index, "path", v)}
                  className={missing ? "text-destructive text-sm" : "text-muted-foreground text-sm"}
                />
                {missing && (
                  <span className="text-[10px] text-destructive">File not found</span>
                )}
              </td>
            );
          }
          return null;
        })}
        <td className="px-1 w-8">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </td>
      </tr>
    );
  },
  (prev, next) =>
    prev.index === next.index &&
    prev.selected === next.selected &&
    prev.duplicate === next.duplicate &&
    prev.missing === next.missing &&
    prev.id === next.id &&
    prev.visibleColumns === next.visibleColumns &&
    prev.track.path === next.track.path &&
    prev.track.title === next.track.title &&
    prev.track.artist === next.track.artist &&
    prev.track.duration === next.track.duration,
);

interface TrackTableProps {
  tracks: Track[];
  filteredIndices: number[] | null;
  missingPaths: Set<number>;
  columns: ColumnConfig[];
  onToggleColumn: (key: ColumnKey) => void;
  onResizeColumn: (key: ColumnKey, width: number) => void;
}

type SortKey = "title" | "artist" | "path";
type SortDir = "asc" | "desc";

export function TrackTable({ tracks, filteredIndices, missingPaths, columns, onToggleColumn, onResizeColumn }: TrackTableProps) {
  const updateTrack = usePlaylistStore((s) => s.updateTrack);
  const removeTrack = usePlaylistStore((s) => s.removeTrack);
  const removeTracks = usePlaylistStore((s) => s.removeTracks);
  const moveTrack = usePlaylistStore((s) => s.moveTrack);
  const addTrack = usePlaylistStore((s) => s.addTrack);
  const sortTracks = usePlaylistStore((s) => s.sortTracks);
  const selection = usePlaylistStore((s) => s.selection);
  const isFiltering = filteredIndices !== null;
  const lastSelectedRef = useRef<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [ctxMenu, setCtxMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);
  const [colMenu, setColMenu] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  const visibleCols = useMemo(() => columns.filter((c) => c.visible), [columns]);
  const prevVisibleKeysRef = useRef<ColumnKey[]>([]);
  const visibleColKeys = useMemo(() => {
    const keys = columns.filter((c) => c.visible).map((c) => c.key);
    const prev = prevVisibleKeysRef.current;
    if (keys.length === prev.length && keys.every((k, i) => k === prev[i])) {
      return prev;
    }
    prevVisibleKeysRef.current = keys;
    return keys;
  }, [columns]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      setSortDir((prevDir) => {
        const newDir = prevKey === key && prevDir === "asc" ? "desc" : "asc";
        sortTracks(key, newDir);
        return newDir;
      });
      return key;
    });
    usePlaylistStore.getState().setSelection(new Set());
  }, [sortTracks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => tracks.map((_, i) => `track-${i}`), [tracks]);

  const visibleIndices = useMemo(() => {
    return filteredIndices ?? tracks.map((_, i) => i);
  }, [filteredIndices, tracks]);

  const visibleIndicesSet = useMemo(() => {
    return new Set(visibleIndices);
  }, [visibleIndices]);

  const handleSelect = useCallback(
    (index: number, shiftKey: boolean) => {
      const { selection: cur, setSelection: set } = usePlaylistStore.getState();
      const next = new Set(cur);
      if (shiftKey && lastSelectedRef.current !== null) {
        const start = Math.min(lastSelectedRef.current, index);
        const end = Math.max(lastSelectedRef.current, index);
        for (let i = start; i <= end; i++) {
          if (!isFiltering || visibleIndicesSet.has(i)) {
            next.add(i);
          }
        }
      } else if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      set(next);
      lastSelectedRef.current = index;
    },
    [isFiltering, visibleIndicesSet],
  );

  const handleSelectAll = useCallback(() => {
    const { selection: cur, setSelection: set } = usePlaylistStore.getState();
    if (cur.size === visibleIndices.length) {
      set(new Set());
    } else {
      set(new Set(visibleIndices));
    }
  }, [visibleIndices]);

  const handleDeleteSelected = useCallback(() => {
    const { selection: cur, setSelection: set } = usePlaylistStore.getState();
    const indices = Array.from(cur).sort((a, b) => b - a);
    if (indices.length > 0) {
      removeTracks(indices);
    }
    set(new Set());
    lastSelectedRef.current = null;
  }, [removeTracks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from !== -1 && to !== -1) moveTrack(from, to);
  }, [ids, moveTrack]);

  const handleUpdate = useCallback((index: number, field: keyof Track, value: string) => {
    const currentTracks = usePlaylistStore.getState().tracks;
    const track = { ...currentTracks[index] };
    if (field === "duration") {
      track.duration = parseDuration(value);
    } else {
      (track[field] as string | null) = value || null;
    }
    updateTrack(index, track);
  }, [updateTrack]);

  const handleContextMenu = useCallback((index: number, x: number, y: number) => {
    setCtxMenu({ index, x, y });
  }, []);

  useClickOutside(ctxRef, !!ctxMenu, () => setCtxMenu(null), true);
  useClickOutside(colMenuRef, colMenu, () => setColMenu(false));

  const ctxAction = useCallback((fn: () => void) => {
    fn();
    setCtxMenu(null);
  }, []);

  const tracksPathsSerialized = JSON.stringify(tracks.map((t) => t.path));
  const duplicateIndices = useMemo(() => {
    const paths: string[] = JSON.parse(tracksPathsSerialized);
    const pathCount = new Map<string, number[]>();
    paths.forEach((path, i) => {
      if (!path) return;
      const key = path.toLowerCase();
      const list = pathCount.get(key);
      if (list) list.push(i);
      else pathCount.set(key, [i]);
    });
    const dupes = new Set<number>();
    for (const indices of pathCount.values()) {
      if (indices.length > 1) indices.forEach((i) => dupes.add(i));
    }
    return dupes;
  }, [tracksPathsSerialized]);

  const allSelected = visibleIndices.length > 0 && selection.size === visibleIndices.length;
  const someSelected = selection.size > 0;

  const totalCols = 3 + visibleCols.length + 1;

  return (
    <div className="flex-1 overflow-auto min-h-0">
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
          <table className="track-table w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: 32 }} />
              <col style={{ width: 32 }} />
              <col style={{ width: 40 }} />
              {visibleCols.map((c) => (
                <col key={c.key} data-col={c.key} style={{ width: c.width }} />
              ))}
              <col style={{ width: 32 }} />
            </colgroup>
            <thead className="border-b bg-background sticky top-0 z-10">
              <tr className="h-8 text-xs text-muted-foreground">
                <th className="w-8 text-left" />
                <th className="w-8 px-1 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={handleSelectAll}
                    className="track-check"
                  />
                </th>
                <th className="w-10 text-center px-1">#</th>
                {visibleCols.map((col) => {
                  const isSortable = col.key === "title" || col.key === "artist" || col.key === "path";
                  const isActive = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      className={`relative px-1 text-left font-medium ${col.key === "duration" ? "text-right" : ""} ${isSortable ? "cursor-pointer select-none hover:bg-muted/50" : ""}`}
                      onClick={isSortable ? () => handleSort(col.key as SortKey) : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {isActive &&
                          (sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          ))}
                      </span>
                      <ResizeHandle
                        colKey={col.key}
                        baseWidth={col.width}
                        minWidth={col.minWidth}
                        onResizeEnd={(w) => onResizeColumn(col.key, w)}
                      />
                    </th>
                  );
                })}
                <th className="w-8 px-1">
                  <div className="relative">
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      onClick={() => setColMenu((v) => !v)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {colMenu && (
                      <div
                        ref={colMenuRef}
                        className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
                      >
                        {columns.map((col) => (
                          <button
                            key={col.key}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => onToggleColumn(col.key)}
                          >
                            {col.visible ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {col.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleIndices.map((i) => (
                <SortableRow
                  key={ids[i]}
                  id={ids[i]}
                  track={tracks[i]}
                  index={i}
                  selected={selection.has(i)}
                  duplicate={duplicateIndices.has(i)}
                  missing={missingPaths.has(i)}
                  visibleColumns={visibleColKeys}
                  onSelect={handleSelect}
                  onUpdate={handleUpdate}
                  onRemove={removeTrack}
                  onContextMenu={handleContextMenu}
                />
              ))}
              {isFiltering && visibleIndices.length === 0 && (
                <tr>
                  <td colSpan={totalCols} className="text-center text-muted-foreground py-8">
                    No matching tracks
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                  usePlaylistStore.getState().setSelection(new Set());
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
