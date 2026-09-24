/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MediaCaptureProvider } from "@/components/media/media-capture-context";
import { DocumentCreateForm } from "../document-create-form";

describe("DocumentCreateForm", () => {
  it("si monta dentro MediaCaptureProvider senza loop di render", () => {
    render(
      <MediaCaptureProvider>
        <DocumentCreateForm
          domain="santini"
          siteId="site-1"
          clients={[
            {
              id: 1,
              businessName: "Stefano Bernasconi",
            },
          ]}
          suppliers={[]}
          offers={[]}
          onGenerated={() => undefined}
          onCancel={() => undefined}
        />
      </MediaCaptureProvider>,
    );

    expect(screen.getByText("Tipo documento")).toBeTruthy();
  });
});
