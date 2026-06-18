import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { usePlaylistStore } from "@/stores/playlist";
import type { Playlist } from "@/stores/playlist";

export function useFileDrop() {
  const setPlaylist = usePlaylistStore((s) => s.setPlaylist);

  useEffect(() => {
    const unlisten = getCurrentWebviewWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === "drop") {
        const paths = event.payload.paths;
        const m3uFile = paths.find(
          (p) => p.endsWith(".m3u") || p.endsWith(".m3u8"),
        );
        if (!m3uFile) return;
        const playlist = await invoke<Playlist>("open_playlist", {
          path: m3uFile,
        });
        setPlaylist(m3uFile, playlist);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setPlaylist]);
}
