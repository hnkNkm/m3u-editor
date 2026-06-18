import "@/App.css";
import { Header } from "@/components/header";
import { TrackTable } from "@/components/track-table";
import { EmptyState } from "@/components/empty-state";
import { usePlaylistStore } from "@/stores/playlist";

function App() {
  const tracks = usePlaylistStore((s) => s.tracks);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      {tracks.length > 0 ? <TrackTable tracks={tracks} /> : <EmptyState />}
    </div>
  );
}

export default App;
