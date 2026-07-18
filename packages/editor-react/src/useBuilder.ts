import { useMemo } from "react";
import { EditorStore, type EditorStoreOptions } from "./EditorStore.js";

/**
 * The main hook, mirroring TipTap's `useEditor`. Create a builder once and use
 * it anywhere. Pass a `deps` array to recreate it when those change (e.g. the
 * Builder Type for a per-route builder).
 *
 * ```tsx
 * const builder = useBuilder({ registry, doc, theme, builderType: "page" });
 * return (
 *   <BuilderProvider builder={builder}>
 *     <Toolbar /> <Palette /> <Canvas /> <Inspector />
 *   </BuilderProvider>
 * );
 * ```
 */
export function useBuilder(options: EditorStoreOptions, deps: unknown[] = []): EditorStore {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new EditorStore(options), deps);
}
