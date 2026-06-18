import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { usePlaylistStore } from "@/stores/playlist";
import type { Playlist } from "@/stores/playlist";

export function useActions() {
  const { filePath, tracks, setPlaylist, addTrack, markClean, undo, redo } =
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

  function handleNew() {
    usePlaylistStore.getState().clear();
  }

  return { handleOpen, handleSave, handleSaveAs, handleAddTrack, handleNew, undo, redo };
}
