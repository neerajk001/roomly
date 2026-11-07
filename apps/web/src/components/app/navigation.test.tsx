import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudioNav } from "./studio-nav";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { WorkflowGuide } from "./workflow-guide";

vi.mock("next/navigation", () => ({ usePathname: () => "/studio/clients/client-one" }));

describe("experience navigation", () => {
  it("keeps both experiences available and identifies the current one", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceSwitcher, { current: "PRO" }));
    expect(html).toContain('href="/app"');
    expect(html).toMatch(/<a(?=[^>]*href="\/studio")(?=[^>]*aria-current="page")[^>]*>/);
  });

  it("marks the client section active on a client detail page, including mobile", () => {
    for (const mobile of [false, true]) {
      const html = renderToStaticMarkup(createElement(StudioNav, { mobile }));
      expect(html).toMatch(/<a(?=[^>]*href="\/studio\/clients")(?=[^>]*aria-current="page")[^>]*>/);
      expect(html).not.toMatch(/<a(?=[^>]*href="\/studio")(?=[^>]*aria-current)[^>]*>/);
      expect(html).toContain('href="/settings"');
      expect(html).toContain('href="/studio/rate-cards"');
    }
  });

  it("gives each audience the appropriate starting actions", () => {
    const home = renderToStaticMarkup(createElement(WorkflowGuide));
    const studio = renderToStaticMarkup(createElement(WorkflowGuide, { studio: true }));
    expect(home).toContain('href="/new"');
    expect(home).toContain("shopping list");
    expect(studio).toContain('href="/studio/clients"');
    expect(studio).toContain('href="/studio/projects/new"');
    expect(studio).toContain('href="/studio/rate-cards"');
  });
});
