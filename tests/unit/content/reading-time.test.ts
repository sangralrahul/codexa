import { describe, expect, it } from "vitest";
import { computeReadingTime, extractHeadings, makeSnippet, markdownToPlainText, slugifyHeading, WORDS_PER_MINUTE } from "@/lib/content/markdown";

describe("reading time", () => {
  it("never reports less than one minute", () => {
    expect(computeReadingTime("Just a few words.")).toEqual({ minutes: 1, words: 4, text: "1 min read" });
  });

  it("rounds words / WORDS_PER_MINUTE and ignores code fences", () => {
    const words = Array.from({ length: WORDS_PER_MINUTE * 3 }, () => "word").join(" ");
    const md = `${words}\n\n\`\`\`ts\nconst x = 1; // these words do not count\n\`\`\`\n`;
    expect(computeReadingTime(md).minutes).toBe(3);
  });
});

describe("headings", () => {
  it("extracts h2/h3 with github-style ids and skips fenced code", () => {
    const md = "# Title\n\n## Stages of a run\n\n```md\n## not a heading\n```\n\n### Review & revert\n\n## Stages of a run\n";
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: "Stages of a run", id: "stages-of-a-run" },
      { depth: 3, text: "Review & revert", id: "review--revert" },
      { depth: 2, text: "Stages of a run", id: "stages-of-a-run-1" },
    ]);
  });

  it("slugifies like rehype-slug", () => {
    expect(slugifyHeading("Ctrl/Cmd+S saves")).toBe("ctrlcmds-saves");
  });

  it("keeps underscores in ids, as rehype-slug does (error-code anchors)", () => {
    expect(slugifyHeading("quota_exceeded (402)")).toBe("quota_exceeded-402");
    const md = "## `quota_exceeded` (402)\n\n## The run was refused with quota_exceeded\n\n## **Bold** and _em_ text\n\n## `unauthorized` (401) / `forbidden` (403)\n";
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: "quota_exceeded (402)", id: "quota_exceeded-402" },
      { depth: 2, text: "The run was refused with quota_exceeded", id: "the-run-was-refused-with-quota_exceeded" },
      { depth: 2, text: "Bold and em text", id: "bold-and-em-text" },
      { depth: 2, text: "unauthorized (401) / forbidden (403)", id: "unauthorized-401--forbidden-403" },
    ]);
  });
});

describe("plain text and snippets", () => {
  it("strips markdown syntax", () => {
    expect(markdownToPlainText("## Hi\n\n- **bold** [link](/x)\n\n> quote")).toBe("Hi bold link quote");
  });

  it("centres the snippet on the first matching term", () => {
    const text = `${"alpha ".repeat(40)}deployment target ${"omega ".repeat(40)}`;
    const snippet = makeSnippet(text, "deployment", 60);
    expect(snippet).toContain("deployment");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
  });
});
