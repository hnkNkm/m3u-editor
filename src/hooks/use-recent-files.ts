import { useCallback, useEffect, useSyncExternalStore } from "react";
import { load } from "@tauri-apps/plugin-store";

const STORE_KEY = "recent-files";
const MAX_RECENT = 10;

let storePromise: ReturnType<typeof load> | null = null;
function getStore() {
  if (!storePromise) storePromise = load("settings.json");
  return storePromise;
}

let recentFilesCache: string[] = [];
let loadRecentFilesPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadRecentFiles();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return recentFilesCache;
}

async function loadRecentFiles() {
  if (!loadRecentFilesPromise) {
    loadRecentFilesPromise = getStore().then(async (store) => {
      const files = await store.get<string[]>(STORE_KEY);
      if (files) {
        recentFilesCache = files;
        emit();
      }
    });
  }

  return loadRecentFilesPromise;
}

async function saveRecentFiles(files: string[]) {
  recentFilesCache = files;
  emit();

  const store = await getStore();
  await store.set(STORE_KEY, files);
  await store.save();
}

export function useRecentFiles() {
  const recentFiles = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void loadRecentFiles();
  }, []);

  const addRecentFile = useCallback(async (filePath: string) => {
    await loadRecentFiles();
    const updated = [
      filePath,
      ...recentFilesCache.filter((file) => file !== filePath),
    ].slice(0, MAX_RECENT);
    await saveRecentFiles(updated);
  }, []);

  const clearRecentFiles = useCallback(async () => {
    await saveRecentFiles([]);
  }, []);

  return { recentFiles, addRecentFile, clearRecentFiles };
}
