import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { usePlaylistStore } from "@/stores/playlist";
import type { Playlist } from "@/stores/playlist";
import { useRecentFiles } from "@/hooks/use-recent-files";

function pathToTrack(p: string) {
  const filename = p.split(/[\\/]/).pop() ?? p;
  const name = filename.replace(/\.[^.]+$/, "");
  return { path: p, title: name, artist: null, duration: null };
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

      const audioFiles = await invoke<string[]>("scan_audio_files", { paths });
      if (audioFiles.length > 0) {
        usePlaylistStore.getState().addTracks(audioFiles.map(pathToTrack));
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setPlaylist, addRecentFile]);
}
