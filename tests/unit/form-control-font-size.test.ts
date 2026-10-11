import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * iOS Safari zooms the page when a focused input/select/textarea computes to
 * under 16px. `globals.css` sets `input { font-size: 16px }`, but a Tailwind
 * size class on the element outranks that bare selector and silently defeats it
 * (this is how the note field ended up zooming). The viewport can't be pinned
 * instead — that fails WCAG SC 1.4.4 — so guard the classes themselves.
 */
const SRC = resolve(__dirname, "../../src");
const SMALL_TEXT = /\btext-(?:xs|sm)\b/;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("form controls stay at 16px or larger", () => {
  it("no input, select or textarea carries text-xs or text-sm", () => {
    const offenders: string[] = [];

    for (const file of tsxFiles(SRC)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<(input|select|textarea)\b/g)) {
        const start = match.index ?? 0;
        // The element's opening tag ends at its className; scan to the next self-close or close tag.
        const rest = source.slice(start);
        const end = rest.search(/\/>|<\/(?:select|textarea)>/);
        const element = end === -1 ? rest : rest.slice(0, end);
        const className = /className=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(element);
        const classes = className?.[1] ?? className?.[2] ?? "";
        if (SMALL_TEXT.test(classes)) {
          const line = source.slice(0, start).split("\n").length;
          offenders.push(`${relative(SRC, file)}:${line} <${match[1]}>`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
