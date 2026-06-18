import "@/App.css";
import { Header } from "@/components/header";
import { TrackTable } from "@/components/track-table";
import { EmptyState } from "@/components/empty-state";
import { usePlaylistStore } from "@/stores/playlist";
import { useFileDrop } from "@/hooks/use-file-drop";

function App() {
  const tracks = usePlaylistStore((s) => s.tracks);
  useFileDrop();

  return (
    <div className="flex h-screen flex-col">
      <Header />
      {tracks.length > 0 ? <TrackTable tracks={tracks} /> : <EmptyState />}
    </div>
  );
}

export default App;
