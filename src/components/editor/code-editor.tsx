"use client";

import dynamic from "next/dynamic";
import { EditorLoading as Loading } from "./editor-loading";

/** SSR-safe wrappers: Monaco is only ever loaded in the browser. */
export const CodeEditor = dynamic(() => import("./monaco").then((m) => m.MonacoCodeEditor), { ssr: false, loading: Loading });
export const CodeDiffEditor = dynamic(() => import("./monaco").then((m) => m.MonacoDiff), { ssr: false, loading: Loading });

export type { CodeEditorHandle, CodeEditorProps } from "./monaco";
