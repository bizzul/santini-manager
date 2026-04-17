---

# Stream 4 - Cache & Realtime Coherence

## Sommario esecutivo

L’unico producer `unstable_cache` con `tags` è in `lib/fetchers.ts` (`getSiteData`), con tag `${subdomain}-metadata` e `revalidate: 900` (15 min). I tag `kanbans` e `kanban-categories` usati nelle server actions **non** hanno producer `unstable_cache` → **F-009 confermato**. Molte `revalidatePath` usano path “flat” (`/kanban`, `/projects`, …) invece di `/sites/[domain]/...` → **F-008 confermato** (M3 roadmap allineata al problema). TanStack: le query usano spesso prefissi `["risorsa", domain, siteId]` mentre invalidazioni e realtime usano prefissi più corti; con il matching parziale default le invalidazioni tendono comunque a funzionare, ma **F-018** resta un debito di convenzione. Il client ha tre livelli di “15 min” per il sito (`getSiteData`, `useSiteId`, `site-data` staleTime) più persistenza selettiva in `app/providers.tsx`. Realtime: la board principale usa solo `useRealtimeKanban` (tabella `Task`); `Kanban`/`KanbanColumn` sono coperte da `useRealtimeKanbanFull` ma usata in `FactoryRealtimeSync`, non sulla Kanban generale.

---

## Mappa query keys

| Chiave (pattern) | File(s) | Anomalia |
|------------------|---------|----------|
| `["suppliers" \| "categories" \| "clients" \| "sell-products" \| "kanban-tasks", domain, siteId]` | `hooks/use-api.ts` (righe ~61–165) | Chiave “completa”; coerente con `useSiteId`. |
| `["suppliers"]`, `["categories"]`, … (solo primo segmento) | `hooks/use-api.ts` `useInvalidateQueries` (247–256) | Prefisso corto: invalida tutte le query che iniziano con quel segmento (multi-tenant / multi-tab ok in molti casi). |
| `["kanban-tasks", domain, siteId]` | `hooks/use-api.ts` | Allineata a invalidazione `["kanban-tasks"]` in realtime/prefetch. |
| `["kanban-tasks"]`, `["tasks"]` | `hooks/use-realtime-kanban.ts` (21–25, 168–169) | `tasks`: nessuna `useQuery` con `queryKey` `["tasks"` trovata → invalidazione probabilmente inutile. |
| `["kanban"]`, `["kanbans"]` | `hooks/use-realtime-kanban.ts` (168–169) | Nessuna `useQuery` con queste chiavi nel grep; `kanbans-list`/`kanban-categories` sono altrove. |
| `["kanbans-list", domain]`, `["kanban-categories", domain]` | `components/app-sidebar.tsx` (624–653) | Chiavi tenant-esplicite. |
| `["kanban-categories"]` (senza domain) | `components/site-settings/KanbanCategoryManagerModal.tsx` (230, 261, 289); `KanbanManagementModal.tsx`, `GlobalKanbanModal.tsx` | **F-018**: stile diverso da sidebar; con matching parziale invalida anche `["kanban-categories", domain]`. |
| `["site-data", domain]` | `components/app-sidebar.tsx` (607–611) | `staleTime: 15 * 60 * 1000` allineato concettualmente a TTL metadata server. |
| `["site-modules", domain]` vs `["site-modules"]` | `hooks/use-site-modules.ts`, `ModuleManagementModal.tsx` (163–168) | Due forme; dipende da `exact` futuro. |
| `["user-context"]` | `hooks/use-user-context.tsx` | In `PERSISTABLE_QUERY_KEYS` in `app/providers.tsx` (18–20). |

---

## revalidateTag orfani

| Tag | File | Producer atteso |
|-----|------|-----------------|
| `kanbans` | `app/sites/[domain]/kanban/actions/duplicate-kanban.action.ts` (103); `duplicate-kanban-category.action.ts` (86, 160); `save-kanban.action.ts` (190, 307); `save-kanban-card-config.action.ts` (79) | Nessuno: l’unico `unstable_cache` con `tags` è in `lib/fetchers.ts` (58–59) con `${subdomain}-metadata`. |
| `kanban-categories` | `duplicate-kanban-category.action.ts` (161) | Stesso: nessun `unstable_cache` con questo tag. |

**Non orfani (coerenti con producer):**  
`${subdomain}-metadata` / `${site.subdomain}-metadata` — `lib/fetchers.ts` (30–59); `lib/actions.ts` (76–78, 189–193, 225–229); `app/api/site-logos/[siteId]/route.ts` (107, 173); `app/api/debug/site-lookup/route.ts` (30).  
**Nota:** `revalidateTag(\`${site.customDomain}-metadata\`)` in `lib/actions.ts` (193, 229) è coerente se `getSiteData(domain)` risolve lo stesso segmento host usato in URL (stesso schema di chiave cache in `lib/fetchers.ts`).

---

## revalidatePath sospetti

| Path | File | Tenant corretto? |
|------|------|------------------|
| `/kanban`, `/` | `duplicate-kanban.action.ts` (101–102); `save-kanban.action.ts` (188–189, 305–306); `duplicate-kanban-category.action.ts` (85–86, 158–159); `save-kanban-state.action.ts` (12); `duplicate-item.action.ts` (216); `archived-item-action.ts` (78) | **No** per app tenant: non includono `/sites/[domain]/...`. |
| `/kanban` (oltre a `/sites/${domain}/kanban` dove presente) | `save-kanban-card-config.action.ts` (76–78) | Duplicato: path tenant ok (76), `/kanban` globale **sospetto**. |
| `/projects`, `/products`, `/clients`, … | Molte actions sotto `app/sites/[domain]/**/actions/` (es. `projects/actions/edit-item.action.ts` 193–196, `create-item.action.ts` 232) | Mix: alcuni file aggiungono `/sites/${domain}/...`, altri solo path root. **Sospetto** dove manca il prefisso tenant. |
| `/timetracking` | `app/sites/[domain]/timetracking/actions/delete-item.action.ts` (20) | **Sospetto**: `edit-item.action.ts` usa `/sites/${domain}/timetracking` (177). |
| `/errortracking` | `errortracking/actions/delete-item.action.ts` (32–34) | Mix con `/sites/${domain}/errortracking` in stesso file. |
| `/qualityControl` | `qualityControl/actions/*.ts` | Path senza `/sites/...` (coerente con F-008). |

**Esempi corretti:** `app/sites/[domain]/collaborators/actions.ts` (196, 229, …); `app/api/projects/consuntivo/route.ts` (97–99).

---

## Realtime gaps (file:linee + rischio)

| Evidenza | Rischio |
|----------|---------|
| `hooks/use-realtime-kanban.ts` (64–117): solo `Task`, filtro `site_id=eq.${siteId}` | Basso per sync card; **medio** se altri utenti modificano colonne/board: la board usa questo hook (`components/kanbans/KanbanBoard.tsx` 592–608), non `useRealtimeKanbanFull`. |
| `use-realtime-kanban.ts` (118–126): `CHANNEL_ERROR` loggato; `useRealtimeKanbanFull` (232–236): nessun ramo `CHANNEL_ERROR` | Osservabilità ridotta su factory/full sync. |
| `use-realtime-kanban.ts` (140–142, 248): `isSubscribed: !!channelRef.current` | **Alto** come metrica UX: il ref non forza re-render dopo `subscribe` → valore spesso fuorviante. |
| `invalidateTaskQueries` + callback in `KanbanBoard` che chiama `refetchTasks` (592–607) | Doppio aggiornamento (invalidate globale + refetch mirato): ridondanza, possibili race minori. |
| `useRealtimeKanbanFull` solo in `components/factory/FactoryRealtimeSync.tsx` (20) | Inconsistenza tra moduli su cosa è realtime. |

---

## Findings nuovi S4-F&lt;NN&gt;

| ID | Descrizione | Severity (indicativa) |
|----|-------------|------------------------|
| **S4-F019** | `lib/cache-utils.ts` usa `CACHE_KEY = "matris-query-cache"` per `clearPersistentCache`, mentre `app/providers.tsx` (72) persiste con `key: "matris-query-cache-v2"` → logout/utente potrebbe non pulire lo storage effettivo del persister. | medium |
| **S4-F020** | `app/getQueryClient.tsx` esporta `QueryClient` in `cache()` ma **nessun import** nel repo → pattern RSC/hydration non cablato. | low |
| **S4-F021** | Invalidazioni `["tasks"]` e `["kanban"]` in `use-realtime-kanban.ts` (24–25, 168–169) senza query registrate con quelle chiavi → rumore / no-op. | low |
| **S4-F022** | Board principale non sottoscrive `Kanban`/`KanbanColumn` in realtime (solo `useRealtimeKanban`); `useRealtimeKanbanFull` altrove. | medium (UX sync struttura) |
| **S4-F023** | `isSubscribed` basato su `ref` dopo subscribe (`use-realtime-kanban.ts` 140–142, 248) non riflette lo stato reale in UI. | low |

---

## Findings audit esistenti confermati

| ID | Esito |
|----|--------|
| **F-008** | **Confermato**: molte `revalidatePath` senza prefisso `/sites/[domain]/...` nelle actions kanban e altre aree. |
| **F-009** | **Confermato**: solo `lib/fetchers.ts` definisce `unstable_cache` con `tags`; `kanbans` / `kanban-categories` sono orfani. |
| **F-018** | **Confermato** come incoerenza di forma (`["kanban-categories"]` vs `["kanban-categories", domain]`); impatto funzionale mitigato dal matching parziale delle invalidazioni. |

---

## Quick wins

- Rimuovere o sostituire `revalidateTag("kanbans"|"kanban-categories")` con tag reali (es. `${subdomain}-metadata` dove ha senso) **oppure** introdurre `unstable_cache` taggato per i segmenti RSC che devono essere invalidati (allineato a M3).
- Allineare `revalidatePath` alle route tenant effettive e deprecare `/kanban`, `/projects`, … dove la UI vive sotto `/sites/[domain]/...`.
- Allineare `clearPersistentCache` alla chiave `matris-query-cache-v2` (o una costante condivisa con `providers.tsx`).
- Uniformare invalidazioni categoria a `["kanban-categories", domain]` (o una factory di query keys).
- Rimuovere invalidazioni `["tasks"]` / `["kanban"]` se non esistono query, o definire le query mancanti.

---

## Interventi strutturali

- **Contratto unico di query keys** (namespace + `domain` + `siteId` dove serve) e helper `queryKeys.kanban.*` usati da hooks, modal, realtime.
- **Strategia unica cache server**: `react cache()` in `lib/server-data.ts` (per-request) vs `unstable_cache` (solo metadata sito) vs invalidazione tag — documentare cosa deve invalidare cosa.
- **Realtime**: decidere se la board deve usare `useRealtimeKanbanFull` o canali dedicati per colonne; valutare backoff/reconnect esplicito oltre al client Supabase.
- **Ridurre** `router.refresh()` + invalidate + refetch nello stesso flusso (`editKanbanTask.tsx` usa `router.refresh()` in più punti) con una gerarchia chiara (client-first vs RSC-first).

---

## Contraddizioni con la roadmap

- **Etichetta stream:** In `docs/AUDIT-ARCH-DATA-OPTIMIZATION-ROADMAP.md`, **M3** (performance query e cache coherence) è sotto **“Stream 3 - Performance/Cache”** (righe 51–65, 92–95). Il template “Stream 4” per questo tema **non coincide** con la numerazione del documento (Stream 4 lì è legato a M4 / quality). Il contenuto tecnico (revalidatePath/tag, query keys) è comunque **M3**.
- Il resto degli obiettivi M3 (riallineare `revalidatePath`, `revalidateTag`, query keys) **è coerente** con quanto emerso nell’audit.

---

## Domande aperte

- Le route “flat” (`/kanban`, `/projects`) sono ancora entry point validi (rewrite) o solo residui? Se non servono, `revalidatePath` su quelle path è **no-op** per la UX tenant.
- In produzione, gli utenti accedono sempre tramite `/sites/[domain]/...` o anche tramite host dedicato senza quel segmento?
- Per `KanbanCategoryManagerModal`, va garantito refetch sidebar anche con `exact: true` in futuro — confermare se si vuole invalidazione sempre con `domain`.

---

**Percorsi assoluti citati:**  
`/Users/matteopaolocci/santini-manager/lib/fetchers.ts`, `lib/actions.ts`, `lib/cache-utils.ts`, `hooks/use-api.ts`, `hooks/use-site-id.ts`, `hooks/use-realtime-kanban.ts`, `app/providers.tsx`, `app/getQueryClient.tsx`, `components/app-sidebar.tsx`, `components/site-settings/KanbanCategoryManagerModal.tsx`, `components/kanbans/KanbanBoard.tsx`, `app/sites/[domain]/kanban/actions/*.ts`.
