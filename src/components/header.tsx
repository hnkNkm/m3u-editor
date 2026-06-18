import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePlaylistStore } from "@/stores/playlist";
import type { Playlist } from "@/stores/playlist";

export function Header() {
  const { filePath, tracks, setPlaylist } = usePlaylistStore();

  async function handleOpen() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "M3U Playlist", extensions: ["m3u", "m3u8"] }],
    });
    if (!selected) return;
    const playlist = await invoke<Playlist>("open_playlist", {
      path: selected,
    });
    setPlaylist(selected, playlist);
  }

  async function handleSave() {
    if (!filePath) return;
    await invoke("save_playlist", { path: filePath, playlist: { tracks } });
  }

  return (
    <header className="flex h-12 items-center gap-2 border-b px-4">
      <Button variant="ghost" size="sm" onClick={handleOpen}>
        <FolderOpen className="mr-1.5 h-4 w-4" />
        Open
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={!filePath}
      >
        <Save className="mr-1.5 h-4 w-4" />
        Save
      </Button>
      <div className="flex-1" />
      {filePath && (
        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
          {filePath}
        </span>
      )}
      <ThemeToggle />
    </header>
  );
}
