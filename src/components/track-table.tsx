import { useState, useRef, useEffect } from "react";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
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

interface TrackTableProps {
  tracks: Track[];
}

export function TrackTable({ tracks }: TrackTableProps) {
  const { updateTrack, removeTrack, moveTrack } = usePlaylistStore();

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
            <TableRow key={i}>
              <TableCell className="px-1">
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={i === 0}
                    onClick={() => moveTrack(i, i - 1)}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={i === tracks.length - 1}
                    onClick={() => moveTrack(i, i + 1)}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell>
                <EditableCell
                  value={track.title ?? ""}
                  onCommit={(v) => handleUpdate(i, "title", v)}
                />
              </TableCell>
              <TableCell>
                <EditableCell
                  value={track.artist ?? ""}
                  onCommit={(v) => handleUpdate(i, "artist", v)}
                />
              </TableCell>
              <TableCell className="text-right">
                <EditableCell
                  value={formatDuration(track.duration)}
                  onCommit={(v) => handleUpdate(i, "duration", v)}
                  className="text-right"
                />
              </TableCell>
              <TableCell>
                <EditableCell
                  value={track.path}
                  onCommit={(v) => handleUpdate(i, "path", v)}
                  className="text-muted-foreground text-sm"
                />
              </TableCell>
              <TableCell className="px-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeTrack(i)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
