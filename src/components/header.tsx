import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen, Save, SaveAll, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePlaylistStore } from "@/stores/playlist";
import type { Playlist } from "@/stores/playlist";

export function Header() {
  const { filePath, tracks, isDirty, setPlaylist, addTrack, markClean } =
    usePlaylistStore();

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
    if (!filePath) {
      handleSaveAs();
      return;
    }
    await invoke("save_playlist", { path: filePath, playlist: { tracks } });
    markClean();
  }

  async function handleSaveAs() {
    const selected = await save({
      filters: [{ name: "M3U Playlist", extensions: ["m3u", "m3u8"] }],
    });
    if (!selected) return;
    await invoke("save_playlist", { path: selected, playlist: { tracks } });
    setPlaylist(selected, { tracks });
  }

  function handleAddTrack() {
    addTrack({ path: "", title: null, artist: null, duration: null });
  }

  return (
    <header className="flex h-12 items-center gap-1 border-b px-3">
      <Button variant="ghost" size="sm" onClick={handleOpen}>
        <FolderOpen className="mr-1.5 h-4 w-4" />
        Open
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={tracks.length === 0}
      >
        <Save className="mr-1.5 h-4 w-4" />
        Save
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSaveAs}
        disabled={tracks.length === 0}
      >
        <SaveAll className="mr-1.5 h-4 w-4" />
        Save As
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button variant="ghost" size="sm" onClick={handleAddTrack}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add Track
      </Button>
      <div className="flex-1" />
      {filePath && (
        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
          {isDirty ? "● " : ""}
          {filePath}
        </span>
      )}
      <ThemeToggle />
    </header>
  );
}
