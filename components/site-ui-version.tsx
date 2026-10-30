"use client";

import { useLayoutEffect } from "react";

import { UI_V2_DATA_ATTRIBUTE_VALUE } from "@/lib/ui-version-settings";

/**
 * Imposta `data-ui="v2"` su <html> mentre si è in uno spazio con il flag
 * `ui_v2_enabled` attivo, e lo rimuove uscendo dallo spazio.
 *
 * Al primo caricamento l'attributo è già impostato dallo script inline
 * renderizzato dal layout (niente flash); questo componente copre la
 * navigazione client-side tra spazi.
 *
 * Gli stili v2 vivono in `app/ui-v2.css`, tutti sotto `html[data-ui="v2"]`:
 * con il flag spento non cambia nulla.
 */
export function SiteUiVersion({ enabled }: { enabled: boolean }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.dataset.ui = UI_V2_DATA_ATTRIBUTE_VALUE;
    } else if (root.dataset.ui === UI_V2_DATA_ATTRIBUTE_VALUE) {
      delete root.dataset.ui;
    }
    return () => {
      if (root.dataset.ui === UI_V2_DATA_ATTRIBUTE_VALUE) {
        delete root.dataset.ui;
      }
    };
  }, [enabled]);

  return null;
}

/** Script inline per impostare l'attributo prima della prima paint. */
export function SiteUiVersionScript() {
  return (
    <script
      // Stringa statica, nessun dato utente.
      dangerouslySetInnerHTML={{
        __html: `document.documentElement.setAttribute("data-ui","${UI_V2_DATA_ATTRIBUTE_VALUE}");`,
      }}
    />
  );
}
