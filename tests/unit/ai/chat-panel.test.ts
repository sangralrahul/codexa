/**
 * Server-render smoke test for the chat panel: proves the client component
 * tree compiles and renders its initial (loading) state without a browser.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { ChatPanel } from "@/components/ai/chat-panel";
import { AssistantParts, PlanPart, ToolCallRow } from "@/components/ai/message-parts";
import { Composer } from "@/components/ai/composer";

describe("ChatPanel (SSR smoke)", () => {
  it("renders the initial state with an accessible composer", () => {
    const html = renderToString(React.createElement(ChatPanel, { projectId: "p1" }));
    expect(html).toContain("Checking AI configuration");
    expect(html).toContain('aria-label="AI assistant"');
    expect(html).toContain('id="ai-composer"');
    expect(html).toMatch(/aria-label="Mode: [A-Za-z]+. Change mode"/);
    expect(html).not.toContain("Mock AI");
  });

  it("renders message parts: plan checklist, tool rows, file chips, markdown and errors", () => {
    const html = renderToString(
      React.createElement(AssistantParts, {
        status: "succeeded",
        parts: [
          { type: "stage", stage: "planning", detail: "Asking for a plan" },
          { type: "plan", steps: ["Inspect files", "Write component"] },
          { type: "text", text: "Here is **bold** and `code`:\n\n```ts\nconst a = 1;\n```" },
          { type: "tool_call", id: "t1", name: "read_file", input: { path: "src/App.tsx" } },
          { type: "tool_result", id: "t1", name: "read_file", output: "export default function App() {}" },
          { type: "file_change", path: "src/components/Feature.tsx", action: "create" },
          { type: "error", message: "Something broke" },
          { type: "stage", stage: "done" },
        ],
      }),
    );
    expect(html).toContain("Inspect files");
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("const a = 1;");
    expect(html).toContain("read_file");
    expect(html).toContain("src/App.tsx");
    expect(html).toContain("src/components/Feature.tsx");
    expect(html).toContain("Something broke");
    expect(html).toContain("Planning");
    expect(html).toContain("Done");
  });

  it("does not render raw HTML from model output", () => {
    const html = renderToString(React.createElement(AssistantParts, { parts: [{ type: "text", text: '<img src=x onerror="alert(1)">hi' }] }));
    expect(html).not.toContain("onerror");
    expect(html).toContain("hi");
  });

  it("renders standalone parts and the composer in fix mode", () => {
    expect(renderToString(React.createElement(PlanPart, { steps: ["a"], done: false }))).toContain('aria-checked="false"');
    expect(renderToString(React.createElement(ToolCallRow, { call: { type: "tool_call", id: "x", name: "run_command", input: { command: "typecheck" } } }))).toContain("typecheck");
    const composer = renderToString(
      React.createElement(Composer, { value: "", onChange: () => {}, mode: "fix", onModeChange: () => {}, onSend: () => {}, onCancel: () => {}, running: false, lastError: "TS2304: Cannot find name" }),
    );
    expect(composer).toContain("Latest error will be sent to the AI");
    expect(composer).toContain("TS2304");
  });
});
