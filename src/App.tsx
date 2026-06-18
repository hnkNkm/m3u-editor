import { useState, useMemo, useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import "@/App.css";
import { Header } from "@/components/header";
import { TrackTable } from "@/components/track-table";
import { EmptyState } from "@/components/empty-state";
import { SearchBar } from "@/components/search-bar";
import { StatusBar } from "@/components/status-bar";
import { usePlaylistStore } from "@/stores/playlist";
import { useFileDrop } from "@/hooks/use-file-drop";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useCloseGuard } from "@/hooks/use-close-guard";

function App() {
  const tracks = usePlaylistStore((s) => s.tracks);
  const filePath = usePlaylistStore((s) => s.filePath);
  const isDirty = usePlaylistStore((s) => s.isDirty);
  const [search, setSearch] = useState("");
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
    if (!search.trim()) return null;
    const q = search.toLowerCase();
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
  }, [tracks, search]);

  const hasTracks = tracks.length > 0;

  return (
    <div className="flex h-screen flex-col">
      <Header />
      {hasTracks && <SearchBar value={search} onChange={setSearch} />}
      {hasTracks ? (
        <TrackTable tracks={tracks} filteredIndices={filteredIndices} />
      ) : (
        <EmptyState />
      )}
      {hasTracks && <StatusBar />}
    </div>
  );
}

export default App;
