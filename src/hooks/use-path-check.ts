import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Track } from "@/stores/playlist";

export function usePathCheck(tracks: Track[]) {
  const [missingPaths, setMissingPaths] = useState<Set<number>>(new Set());

  // Extract paths and serialize them to create a stable dependency
  const pathsSerialized = JSON.stringify(tracks.map((t) => t.path));

  useEffect(() => {
    const paths: string[] = JSON.parse(pathsSerialized);
    const nonEmpty = paths.some((p) => p.length > 0);
    if (!nonEmpty) {
      setMissingPaths(new Set());
      return;
    }

    invoke<boolean[]>("check_paths", { paths }).then((results) => {
      const missing = new Set<number>();
      results.forEach((exists, i) => {
        if (paths[i] && !exists) missing.add(i);
      });
      setMissingPaths(missing);
    });
  }, [pathsSerialized]);

  return missingPaths;
}
