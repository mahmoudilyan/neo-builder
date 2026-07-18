import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { ElementNode } from "@neo-builder/core";
import type { EditorState, EditorStore } from "./EditorStore.js";

const Ctx = createContext<EditorStore | null>(null);

/** Low-level store provider. Prefer `<BuilderProvider>` which also wires DnD. */
export const EditorProvider = Ctx.Provider;

/** Access the builder store (commands + event bus). */
export function useEditor(): EditorStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useEditor must be used within <BuilderProvider>");
  return store;
}
/** Composable alias. */
export const useCurrentBuilder = useEditor;

/** Subscribe to reactive editor state. */
export function useEditorState(): EditorState {
  const store = useEditor();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
/** Composable alias. */
export const useBuilderState = useEditorState;

/** A pluggable inline text editor (plain by default; TipTap is opt-in). */
export type TextEditorComponent = (props: { node: ElementNode; onDone: () => void }) => ReactNode;

const TextEditorCtx = createContext<TextEditorComponent | null>(null);
export const TextEditorProvider = TextEditorCtx.Provider;

/** The inline text editor for `text` Elements. Defaults to plain contentEditable. */
export function useTextEditor(): TextEditorComponent | null {
  return useContext(TextEditorCtx);
}
