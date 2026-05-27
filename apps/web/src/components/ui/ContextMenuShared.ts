import { createContext } from "react";

export const ContextMenuCloseContext = createContext<(() => void) | null>(null);

export const contextMenuClassName =
  "overflow-visible rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/50";
