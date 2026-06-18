import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ask } from "@tauri-apps/plugin-dialog";
import { usePlaylistStore } from "@/stores/playlist";

export function useCloseGuard() {
  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();
    const unlisten = appWindow.onCloseRequested(async (event) => {
      const { isDirty } = usePlaylistStore.getState();
      if (!isDirty) return;

      const confirmed = await ask(
        "Unsaved changes will be lost. Close anyway?",
        { title: "Confirm Close", kind: "warning" },
      );
      if (!confirmed) {
        event.preventDefault();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
