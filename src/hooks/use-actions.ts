import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { usePlaylistStore } from "@/stores/playlist";
import type { Playlist } from "@/stores/playlist";

interface ActionOptions {
  onFileOpened?: (path: string) => void;
}

export function useActions(opts?: ActionOptions) {
  const { filePath, tracks, setPlaylist, addTrack, markClean, undo, redo } =
    usePlaylistStore();

  async function openFile(path: string) {
    const playlist = await invoke<Playlist>("open_playlist", { path });
    setPlaylist(path, playlist);
    opts?.onFileOpened?.(path);
  }

  async function handleOpen() {
    const { isDirty } = usePlaylistStore.getState();
    if (isDirty) {
      const confirmed = await ask(
        "Unsaved changes will be lost. Continue?",
        { title: "Open Playlist", kind: "warning" },
      );
      if (!confirmed) return;
    }
    const selected = await open({
      multiple: false,
      filters: [{ name: "M3U Playlist", extensions: ["m3u", "m3u8"] }],
    });
    if (!selected) return;
    await openFile(selected);
  }

  async function handleOpenRecent(path: string) {
    const { isDirty } = usePlaylistStore.getState();
    if (isDirty) {
      const confirmed = await ask(
        "Unsaved changes will be lost. Continue?",
        { title: "Open Playlist", kind: "warning" },
      );
      if (!confirmed) return;
    }
    await openFile(path);
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
    opts?.onFileOpened?.(selected);
  }

  function handleAddEmptyTrack() {
    addTrack({ path: "", title: null, artist: null, duration: null });
  }

  async function handleAddFiles() {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Audio Files",
          extensions: [
            "mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "wma",
          ],
        },
      ],
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    const newTracks = paths.map((p) => {
      const filename = p.split(/[\\/]/).pop() ?? p;
      const name = filename.replace(/\.[^.]+$/, "");
      return { path: p, title: name, artist: null, duration: null };
    });
    usePlaylistStore.getState().addTracks(newTracks);
  }

  async function handleNew() {
    const { isDirty } = usePlaylistStore.getState();
    if (isDirty) {
      const confirmed = await ask(
        "Unsaved changes will be lost. Continue?",
        { title: "New Playlist", kind: "warning" },
      );
      if (!confirmed) return;
    }
    usePlaylistStore.getState().clear();
  }

  return {
    handleOpen,
    handleOpenRecent,
    handleSave,
    handleSaveAs,
    handleAddEmptyTrack,
    handleAddFiles,
    handleNew,
    undo,
    redo,
  };
}
