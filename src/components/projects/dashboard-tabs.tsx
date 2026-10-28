"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * The dashboard's lower half: "Recent projects" and "Templates" as tabs (server-rendered panels).
 * The chosen tab is remembered for the session.
 */
export function DashboardTabs({ projects, templates, projectCount, aside }: { projects: React.ReactNode; templates: React.ReactNode; projectCount: number; aside?: React.ReactNode }) {
  const [tab, setTab] = React.useState("projects");
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem("codexa:dash-tab");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after mount (SSR-safe)
      if (saved === "projects" || saved === "templates") setTab(saved);
    } catch {
      // storage unavailable: keep the default tab
    }
  }, []);
  const change = (v: string) => {
    setTab(v);
    try {
      sessionStorage.setItem("codexa:dash-tab", v);
    } catch {
      // ignore
    }
  };
  return (
    <Tabs value={tab} onValueChange={change}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <TabsList aria-label="Projects and templates">
          <TabsTrigger value="projects">
            Recent projects{projectCount > 0 ? <span className="ml-1.5 text-muted-foreground tabular-nums">{projectCount}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        {aside}
      </div>
      <TabsContent value="projects">{projects}</TabsContent>
      <TabsContent value="templates">{templates}</TabsContent>
    </Tabs>
  );
}
