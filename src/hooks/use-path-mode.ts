import { useState, useEffect, useCallback } from "react";
import { load } from "@tauri-apps/plugin-store";

const STORE_KEY = "use-relative-paths";

let storePromise: ReturnType<typeof load> | null = null;
function getStore() {
  if (!storePromise) storePromise = load("settings.json");
  return storePromise;
}

export function usePathMode() {
  const [useRelative, setUseRelative] = useState(true);

  useEffect(() => {
    getStore().then(async (store) => {
      const val = await store.get<boolean>(STORE_KEY);
      if (val !== null && val !== undefined) setUseRelative(val);
    });
  }, []);

  const togglePathMode = useCallback(async () => {
    const next = !useRelative;
    setUseRelative(next);
    const store = await getStore();
    await store.set(STORE_KEY, next);
    await store.save();
  }, [useRelative]);

  return { useRelative, togglePathMode };
}
