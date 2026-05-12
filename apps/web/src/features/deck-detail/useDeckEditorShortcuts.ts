import { useEffect } from "react";

export function useDeckEditorShortcuts(
  compareMode: boolean,
  undoEditorChange: () => void,
  redoEditorChange: () => void,
) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        compareMode ||
        target?.closest("input,textarea,select") ||
        target?.isContentEditable ||
        !(event.metaKey || event.ctrlKey)
      ) {
        return;
      }

      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoEditorChange();
        } else {
          undoEditorChange();
        }
      }

      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoEditorChange();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [compareMode, redoEditorChange, undoEditorChange]);
}
