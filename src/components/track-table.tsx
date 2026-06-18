import { useState, useRef, useEffect } from "react";
import { Trash2, GripVertical } from "lucide-react";
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
  onUpdate,
  onRemove,
  id,
}: {
  track: Track;
  index: number;
  onUpdate: (index: number, field: keyof Track, value: string) => void;
  onRemove: (index: number) => void;
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
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="px-1 w-8">
        <button
          className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
          className="text-muted-foreground text-sm"
        />
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
}

export function TrackTable({ tracks }: TrackTableProps) {
  const { updateTrack, removeTrack, moveTrack } = usePlaylistStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = tracks.map((_, i) => `track-${i}`);

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

  return (
    <div className="flex-1 overflow-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead className="w-24 text-right">Duration</TableHead>
                <TableHead>Path</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track, i) => (
                <SortableRow
                  key={ids[i]}
                  id={ids[i]}
                  track={track}
                  index={i}
                  onUpdate={handleUpdate}
                  onRemove={removeTrack}
                />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
    </div>
  );
}
