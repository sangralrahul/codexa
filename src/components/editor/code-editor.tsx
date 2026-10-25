"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/misc";

const Loading = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
    <Spinner className="mr-2" /> Loading editor…
  </div>
);

/** SSR-safe wrappers: Monaco is only ever loaded in the browser. */
export const CodeEditor = dynamic(() => import("./monaco").then((m) => m.MonacoCodeEditor), { ssr: false, loading: Loading });
export const CodeDiffEditor = dynamic(() => import("./monaco").then((m) => m.MonacoDiff), { ssr: false, loading: Loading });

export type { CodeEditorHandle, CodeEditorProps } from "./monaco";
