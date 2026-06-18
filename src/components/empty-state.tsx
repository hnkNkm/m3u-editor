import { Music } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
      <Music className="h-16 w-16" />
      <div className="text-center">
        <p className="text-lg font-medium">No playlist loaded</p>
        <p className="text-sm">Open or drop an M3U file to get started</p>
      </div>
    </div>
  );
}
