import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { usePlaylistStore } from "@/stores/playlist";
import type { Playlist } from "@/stores/playlist";
import { useRecentFiles } from "@/hooks/use-recent-files";

const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".wma",
]);

function isAudioFile(path: string): boolean {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
}

export function useFileDrop() {
  const setPlaylist = usePlaylistStore((s) => s.setPlaylist);
  const { addRecentFile } = useRecentFiles();

  useEffect(() => {
    const unlisten = getCurrentWebviewWindow().onDragDropEvent(async (event) => {
      if (event.payload.type !== "drop") return;

      const paths = event.payload.paths;
      const m3uFile = paths.find(
        (p) => p.endsWith(".m3u") || p.endsWith(".m3u8"),
      );

      if (m3uFile) {
        const playlist = await invoke<Playlist>("open_playlist", {
          path: m3uFile,
        });
        setPlaylist(m3uFile, playlist);
        addRecentFile(m3uFile);
        return;
      }

      const audioFiles = paths.filter(isAudioFile);
      if (audioFiles.length > 0) {
        const newTracks = audioFiles.map((p) => {
          const filename = p.split(/[\\/]/).pop() ?? p;
          const name = filename.replace(/\.[^.]+$/, "");
          return { path: p, title: name, artist: null, duration: null };
        });
        usePlaylistStore.getState().addTracks(newTracks);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setPlaylist, addRecentFile]);
}
