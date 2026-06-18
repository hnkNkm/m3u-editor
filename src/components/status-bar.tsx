import { usePlaylistStore } from "@/stores/playlist";

function formatTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface StatusBarProps {
  useRelative: boolean;
  onTogglePathMode: () => void;
}

export function StatusBar({ useRelative, onTogglePathMode }: StatusBarProps) {
  const tracks = usePlaylistStore((s) => s.tracks);

  const totalDuration = tracks.reduce(
    (sum, t) => sum + (t.duration != null && t.duration >= 0 ? t.duration : 0),
    0,
  );

  return (
    <footer className="flex h-7 items-center justify-between border-t px-4 text-xs text-muted-foreground">
      <span>
        {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
      </span>
      <div className="flex items-center gap-3">
        {totalDuration > 0 && <span>{formatTotalDuration(totalDuration)}</span>}
        <button
          className="hover:text-foreground transition-colors"
          onClick={onTogglePathMode}
        >
          Path: {useRelative ? "Relative" : "Absolute"}
        </button>
      </div>
    </footer>
  );
}
