import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import "@/App.css";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { SearchBar } from "@/components/search-bar";
import { StatusBar } from "@/components/status-bar";
import { usePlaylistStore } from "@/stores/playlist";
import { useFileDrop } from "@/hooks/use-file-drop";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useCloseGuard } from "@/hooks/use-close-guard";
import { usePathCheck } from "@/hooks/use-path-check";
import { usePathMode } from "@/hooks/use-path-mode";
import { useColumnSettings } from "@/hooks/use-column-settings";

const TrackTable = lazy(() =>
  import("@/components/track-table").then((module) => ({
    default: module.TrackTable,
  })),
);

function App() {
  const tracks = usePlaylistStore((s) => s.tracks);
  const filePath = usePlaylistStore((s) => s.filePath);
  const isDirty = usePlaylistStore((s) => s.isDirty);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const trackPaths = useMemo(() => tracks.map((track) => track.path), [tracks]);
  const missingPaths = usePathCheck(trackPaths);
  const { useRelative, togglePathMode } = usePathMode();
  const { columns, toggleColumn, resizeColumn } = useColumnSettings();
  useFileDrop();
  useShortcuts();
  useCloseGuard();

  useEffect(() => {
    const fileName = filePath?.split(/[\\/]/).pop() ?? null;
    const prefix = isDirty ? "● " : "";
    const title = fileName ? `${prefix}${fileName} — m3u-editor` : "m3u-editor";
    getCurrentWebviewWindow().setTitle(title);
  }, [filePath, isDirty]);

  const filteredIndices = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return null;
    return tracks.reduce<number[]>((acc, track, i) => {
      if (
        (track.title?.toLowerCase().includes(q)) ||
        (track.artist?.toLowerCase().includes(q)) ||
        track.path.toLowerCase().includes(q)
      ) {
        acc.push(i);
      }
      return acc;
    }, []);
  }, [tracks, deferredSearch]);

  const hasTracks = tracks.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header useRelative={useRelative} />
      {hasTracks && <SearchBar value={search} onChange={setSearch} />}
      {hasTracks ? (
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Loading tracks...
            </div>
          }
        >
          <TrackTable
            tracks={tracks}
            filteredIndices={filteredIndices}
            missingPaths={missingPaths}
            columns={columns}
            onToggleColumn={toggleColumn}
            onResizeColumn={resizeColumn}
          />
        </Suspense>
      ) : (
        <EmptyState />
      )}
      {hasTracks && (
        <StatusBar
          useRelative={useRelative}
          onTogglePathMode={togglePathMode}
        />
      )}
    </div>
  );
}

export default App;
