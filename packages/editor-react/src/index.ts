export { EditorStore, type EditorState, type EditorStoreOptions } from "./EditorStore.js";
export { useBuilder } from "./useBuilder.js";
export { BuilderProvider, type BuilderProviderProps } from "./components/BuilderProvider.js";
export { PlainText } from "./components/PlainText.js";
export {
  type BuilderType,
  type BuilderTypeMeta,
  BUILDER_TYPES,
  BUILDER_TYPE_LIST,
  isAvailable,
} from "./builderType.js";
export {
  EditorProvider,
  TextEditorProvider,
  useEditor,
  useEditorState,
  useCurrentBuilder,
  useBuilderState,
  useTextEditor,
  type TextEditorComponent,
} from "./context.js";
export {
  builtinCommands,
  builtinCommandSpecs,
  type EditorChain,
  type Command,
  type CommandFactory,
  type CommandCtx,
  type CommandDraft,
  type CommandSpec,
  type CommandParam,
  type CommandLogEntry,
} from "./commands.js";
export { Editor, type EditorProps } from "./components/Editor.js";
export { Canvas } from "./components/Canvas.js";
export { Palette } from "./components/Palette.js";
export { InsertMenu, type InsertMenuProps } from "./components/InsertMenu.js";
export { Inspector } from "./components/Inspector.js";
export { ThemePanel } from "./components/ThemePanel.js";
export { Toolbar } from "./components/Toolbar.js";
export { GrabPrompt } from "./components/GrabPrompt.js";
export { buildNodeContext, nodePath, type GrabInput } from "./grab.js";
export type {
  EditorEvents,
  EditorEventType,
  EditorEventHandler,
} from "./events.js";

import { EditorStore, type EditorStoreOptions } from "./EditorStore.js";
/** Convenience factory. */
export function createEditorStore(opts: EditorStoreOptions): EditorStore {
  return new EditorStore(opts);
}
