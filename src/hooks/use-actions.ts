import { useRef, useCallback } from "react";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { usePlaylistStore } from "@/stores/playlist";
import type { Playlist } from "@/stores/playlist";

function pathToTrack(p: string) {
  const filename = p.split(/[\\/]/).pop() ?? p;
  const name = filename.replace(/\.[^.]+$/, "");
  return { path: p, title: name, artist: null, duration: null };
}

interface ActionOptions {
  onFileOpened?: (path: string) => void;
  useRelative?: boolean;
}

export function useActions(opts?: ActionOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const undo = usePlaylistStore((s) => s.undo);
  const redo = usePlaylistStore((s) => s.redo);

  const openFile = useCallback(async (path: string) => {
    const playlist = await invoke<Playlist>("open_playlist", { path });
    usePlaylistStore.getState().setPlaylist(path, playlist);
    optsRef.current?.onFileOpened?.(path);
  }, []);

  const handleOpen = useCallback(async () => {
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
  }, [openFile]);

  const handleOpenRecent = useCallback(async (path: string) => {
    const { isDirty } = usePlaylistStore.getState();
    if (isDirty) {
      const confirmed = await ask(
        "Unsaved changes will be lost. Continue?",
        { title: "Open Playlist", kind: "warning" },
      );
      if (!confirmed) return;
    }
    await openFile(path);
  }, [openFile]);

  const handleSaveAs = useCallback(async () => {
    const { tracks, setPlaylist } = usePlaylistStore.getState();
    const selected = await save({
      filters: [{ name: "M3U Playlist", extensions: ["m3u", "m3u8"] }],
    });
    if (!selected) return;
    await invoke("save_playlist", {
      path: selected,
      playlist: { tracks },
      useRelative: optsRef.current?.useRelative ?? false,
    });
    setPlaylist(selected, { tracks });
    optsRef.current?.onFileOpened?.(selected);
  }, []);

  const handleSave = useCallback(async () => {
    const { filePath, tracks, markClean } = usePlaylistStore.getState();
    if (!filePath) {
      handleSaveAs();
      return;
    }
    await invoke("save_playlist", {
      path: filePath,
      playlist: { tracks },
      useRelative: optsRef.current?.useRelative ?? false,
    });
    markClean();
  }, [handleSaveAs]);

  const handleAddEmptyTrack = useCallback(() => {
    usePlaylistStore.getState().addTrack({ path: "", title: null, artist: null, duration: null });
  }, []);

  const handleAddFiles = useCallback(async () => {
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
    const audioFiles = await invoke<string[]>("scan_audio_files", { paths });
    if (audioFiles.length > 0) {
      usePlaylistStore.getState().addTracks(audioFiles.map(pathToTrack));
    }
  }, []);

  const handleAddFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: true });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    const audioFiles = await invoke<string[]>("scan_audio_files", { paths });
    if (audioFiles.length > 0) {
      usePlaylistStore.getState().addTracks(audioFiles.map(pathToTrack));
    }
  }, []);

  const handleNew = useCallback(async () => {
    const { isDirty, clear } = usePlaylistStore.getState();
    if (isDirty) {
      const confirmed = await ask(
        "Unsaved changes will be lost. Continue?",
        { title: "New Playlist", kind: "warning" },
      );
      if (!confirmed) return;
    }
    clear();
  }, []);

  const handleSaveSelected = useCallback(async (indices: number[]) => {
    const { tracks } = usePlaylistStore.getState();
    const selectedTracks = indices.map((i) => tracks[i]);
    const selected = await save({
      filters: [{ name: "M3U Playlist", extensions: ["m3u", "m3u8"] }],
    });
    if (!selected) return;
    await invoke("save_playlist", {
      path: selected,
      playlist: { tracks: selectedTracks },
      useRelative: optsRef.current?.useRelative ?? false,
    });
  }, []);

  return {
    handleOpen,
    handleOpenRecent,
    handleSave,
    handleSaveAs,
    handleSaveSelected,
    handleAddEmptyTrack,
    handleAddFiles,
    handleAddFolder,
    handleNew,
    undo,
    redo,
  };
}

