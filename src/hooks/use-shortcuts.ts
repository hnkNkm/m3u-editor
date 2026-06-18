import { useEffect } from "react";
import { useActions } from "@/hooks/use-actions";

export function useShortcuts() {
  const { handleOpen, handleSave, handleNew, undo, redo } = useActions();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case "o":
          e.preventDefault();
          handleOpen();
          break;
        case "s":
          e.preventDefault();
          handleSave();
          break;
        case "n":
          e.preventDefault();
          handleNew();
          break;
        case "z":
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case "y":
          e.preventDefault();
          redo();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleOpen, handleSave, handleNew, undo, redo]);
}
