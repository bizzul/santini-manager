/**
 * Light snapshot test for the standardized layout primitives.
 *
 * Goal: catch regressions where someone reverts the canonical shells to
 * `slate-*` / `bg-white` / `container` patterns.
 *
 * Uses `react-dom/server.renderToStaticMarkup` so we do NOT need
 * `@testing-library/react` (which is not installed).
 */

import React from "react";
// Use the Node SSR entry explicitly: jsdom does not provide MessageChannel
// which the browser entry imported via `react-dom/server` requires.
import { renderToStaticMarkup } from "react-dom/server.node";

import {
  PageLayout,
  PageHeader,
  PageContent,
} from "@/components/page-layout";

describe("Standardized page layout primitives", () => {
  it("PageLayout outer wrapper uses h-full + flex column", () => {
    const html = renderToStaticMarkup(
      <PageLayout>
        <div>content</div>
      </PageLayout>
    );

    expect(html).toContain("flex");
    expect(html).toContain("flex-col");
    expect(html).toContain("h-full");
    expect(html).toContain("w-full");
  });

  it("PageHeader (typed API) renders the title + subtitle + actions and uses bg-page tokens", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Clienti"
        subtitle="Elenco completo dei clienti del sito"
        actions={<button type="button">Aggiungi</button>}
      />
    );

    expect(html).toContain("Clienti");
    expect(html).toContain("Elenco completo dei clienti del sito");
    expect(html).toContain("Aggiungi");

    expect(html).toContain("sticky");
    expect(html).toContain("bg-page/95");
    expect(html).toContain("border-b");

    // Anti-regression: no raw slate/gray/white/black backgrounds
    expect(html).not.toMatch(/bg-slate-/);
    expect(html).not.toMatch(/bg-gray-/);
    expect(html).not.toMatch(/bg-white(?:\W|$)/);
    expect(html).not.toMatch(/bg-black(?:\W|$)/);
  });

  it("PageHeader (legacy children API) still arranges children in a flex row", () => {
    const html = renderToStaticMarkup(
      <PageHeader>
        <h1>Title</h1>
        <button type="button">Action</button>
      </PageHeader>
    );

    expect(html).toContain("items-center");
    expect(html).toContain("justify-between");
    expect(html).toContain("Title");
    expect(html).toContain("Action");
  });

  it("PageContent default variant uses scrollable padded area", () => {
    const html = renderToStaticMarkup(
      <PageContent>
        <div>body</div>
      </PageContent>
    );

    expect(html).toContain("overflow-auto");
    expect(html).toContain("px-4");
    expect(html).toContain("py-4");
    expect(html).toContain("body");
  });

  it("PageContent narrow variant centers direct children to max-w-4xl", () => {
    const html = renderToStaticMarkup(
      <PageContent variant="narrow">
        <div>body</div>
      </PageContent>
    );

    // `&` and `>` are HTML-escaped by renderToStaticMarkup.
    expect(html).toContain("[&amp;&gt;*]:mx-auto");
    expect(html).toContain("[&amp;&gt;*]:max-w-4xl");
  });
});
