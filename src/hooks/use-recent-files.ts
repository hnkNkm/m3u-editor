import { useState, useEffect, useCallback } from "react";
import { load } from "@tauri-apps/plugin-store";

const STORE_KEY = "recent-files";
const MAX_RECENT = 10;

let storePromise: ReturnType<typeof load> | null = null;
function getStore() {
  if (!storePromise) storePromise = load("settings.json");
  return storePromise;
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  useEffect(() => {
    getStore().then(async (store) => {
      const files = await store.get<string[]>(STORE_KEY);
      if (files) setRecentFiles(files);
    });
  }, []);

  const addRecentFile = useCallback(async (filePath: string) => {
    const store = await getStore();
    const current = (await store.get<string[]>(STORE_KEY)) ?? [];
    const updated = [filePath, ...current.filter((f) => f !== filePath)].slice(
      0,
      MAX_RECENT,
    );
    await store.set(STORE_KEY, updated);
    await store.save();
    setRecentFiles(updated);
  }, []);

  const clearRecentFiles = useCallback(async () => {
    const store = await getStore();
    await store.set(STORE_KEY, []);
    await store.save();
    setRecentFiles([]);
  }, []);

  return { recentFiles, addRecentFile, clearRecentFiles };
}
