import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function usePathCheck(paths: string[]) {
  const [missingPaths, setMissingPaths] = useState<Set<number>>(new Set());
  const requestIdRef = useRef(0);

  const pathsSignature = useMemo(() => paths.join("\0"), [paths]);

  useEffect(() => {
    const currentPaths = pathsSignature ? pathsSignature.split("\0") : [];
    const requestId = ++requestIdRef.current;

    if (!currentPaths.some((path) => path.length > 0)) {
      setMissingPaths(new Set());
      return;
    }

    invoke<boolean[]>("check_paths", { paths: currentPaths }).then((results) => {
      if (requestId !== requestIdRef.current) return;

      const missing = new Set<number>();
      results.forEach((exists, i) => {
        if (currentPaths[i] && !exists) missing.add(i);
      });
      setMissingPaths(missing);
    });
  }, [pathsSignature]);

  return missingPaths;
}
