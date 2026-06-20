import { useState, useEffect, useCallback, useRef } from "react";
import { load } from "@tauri-apps/plugin-store";

export type ColumnKey = "title" | "artist" | "duration" | "path";

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "title", label: "Title", visible: true, width: 200, minWidth: 80 },
  { key: "artist", label: "Artist", visible: true, width: 150, minWidth: 60 },
  { key: "duration", label: "Duration", visible: true, width: 80, minWidth: 60 },
  { key: "path", label: "Path", visible: true, width: 300, minWidth: 80 },
];

const STORE_KEY = "column-settings";

let storePromise: ReturnType<typeof load> | null = null;
function getStore() {
  if (!storePromise) storePromise = load("settings.json");
  return storePromise;
}

interface StoredColumn {
  key: ColumnKey;
  visible: boolean;
  width: number;
}

export function useColumnSettings() {
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const loadedRef = useRef(false);

  useEffect(() => {
    getStore().then(async (store) => {
      const saved = await store.get<StoredColumn[]>(STORE_KEY);
      if (saved) {
        setColumns((prev) =>
          prev.map((col) => {
            const s = saved.find((c) => c.key === col.key);
            return s ? { ...col, visible: s.visible, width: s.width } : col;
          }),
        );
      }
      loadedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    const data: StoredColumn[] = columns.map((c) => ({
      key: c.key,
      visible: c.visible,
      width: c.width,
    }));
    getStore().then(async (store) => {
      await store.set(STORE_KEY, data);
      await store.save();
    });
  }, [columns]);

  const toggleColumn = useCallback((key: ColumnKey) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)),
    );
  }, []);

  const resizeColumn = useCallback((key: ColumnKey, width: number) => {
    setColumns((prev) =>
      prev.map((c) =>
        c.key === key ? { ...c, width: Math.max(c.minWidth, width) } : c,
      ),
    );
  }, []);

  return { columns, toggleColumn, resizeColumn };
}
