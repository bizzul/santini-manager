import type { MetadataRoute } from "next";

const ICON_PURPOSE_ANY = "any" as const;
const ICON_PURPOSE_MASKABLE = "maskable" as const;

/**
 * Web App Manifest for the Full Data Manager PWA.
 * Served at `/manifest.webmanifest` by the App Router.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Full Data Manager",
    short_name: "FDM",
    description:
      "Gestione operativa, anagrafiche, documenti e foto da smartphone o desktop.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "it",
    dir: "ltr",
    background_color: "#161d2a",
    theme_color: "#161d2a",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: ICON_PURPOSE_ANY,
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: ICON_PURPOSE_ANY,
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: ICON_PURPOSE_MASKABLE,
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: ICON_PURPOSE_MASKABLE,
      },
    ],
    shortcuts: [
      {
        name: "I miei spazi",
        short_name: "Spazi",
        url: "/sites/select",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
