# RLS Hardening — accessi completi per tabella

Appendice di [`docs/RLS-HARDENING-2026-09.md`](../RLS-HARDENING-2026-09.md).
Generato il 22.09.2026 scansionando `.from("<Tabella>")` in tutto il repo,
inclusi `scripts/` e `__tests__/`.

Client: **service** = `createServiceClient()` (bypassa la RLS) · **server sessione** =
`createClient()` da `utils/supabase/server` · **browser** = `createClient()` da
`utils/supabase/client` · **misto** = il file usa più client, va letto a mano.

Operazioni: S = select, I = insert, U = update, D = delete, I+U = upsert.

### `Task` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 591, 660, 780, 790 | server sessione | S D U |
| `app/api/competitors/route.ts` | 25 | server sessione | S |
| `app/api/cron/auto-archive/route.ts` | 52, 79 | server sessione | S U |
| `app/api/debug/kanbans/route.ts` | 30 | server sessione | S |
| `app/api/fatturazione/tasks/[taskId]/readiness/route.ts` | 64 | server sessione | S |
| `app/api/fatturazione/tasks/[taskId]/supplementi/route.ts` | 66, 74 | server sessione | S |
| `app/api/kanban/snapshot/route.ts` | 33 | server sessione | S |
| `app/api/kanban/tasks/[id]/route.ts` | 75, 251, 356, 453, 463 | server sessione | S U D |
| `app/api/kanban/tasks/altro/route.ts` | 38, 61 | server sessione | S U |
| `app/api/kanban/tasks/create/route.ts` | 372, 427, 504 | server sessione | I S U |
| `app/api/kanban/tasks/ferramenta/route.ts` | 39, 69 | server sessione | S U |
| `app/api/kanban/tasks/legno/route.ts` | 38, 61 | server sessione | S U |
| `app/api/kanban/tasks/metalli/route.ts` | 39, 69 | server sessione | S U |
| `app/api/kanban/tasks/move/route.ts` | 59, 90, 126, 217, 257, 276, 300, 438, 492, 720 | server sessione | S U I |
| `app/api/kanban/tasks/route.ts` | 91 | server sessione | S |
| `app/api/kanban/tasks/stoccato/route.ts` | 38 | server sessione | U S |
| `app/api/kanban/tasks/unique-code/[id]/route.ts` | 18 | server sessione | S |
| `app/api/kanban/tasks/vernice/route.ts` | 38, 61 | server sessione | S U |
| `app/api/offers/pdf/route.ts` | 62 | service | S |
| `app/api/projects/consuntivo/route.ts` | 52, 76 | service | S U |
| `app/api/quick-actions/data/route.ts` | 85 | server sessione | S |
| `app/api/reports/fatture-out-summary/route.ts` | 171, 181 | service | S |
| `app/api/reports/imb/route.ts` | 59 | server sessione | S |
| `app/api/reports/project-consuntivo-summary/route.ts` | 58 | service | S |
| `app/api/reports/project-consuntivo/route.ts` | 79 | service | S |
| `app/api/reports/project-summary/route.ts` | 119, 127 | service | S |
| `app/api/reports/tasks/route.ts` | 101 | service | S |
| `app/api/tasks/[taskId]/notes/route.ts` | 56, 72, 107, 216, 232 | server sessione | S U |
| `app/api/tasks/generate-code/route.ts` | 196 | server sessione | S |
| `app/api/tasks/notifications/route.ts` | 26 | server sessione | S |
| `app/api/tasks/offers/route.ts` | 33, 68 | server sessione | S |
| `app/api/tasks/route.ts` | 16 | server sessione | S |
| `app/api/time-tracking/create/route.ts` | 117 | server sessione | S |
| `app/api/voice-input/command/route.ts` | 478 | server sessione | S |
| `app/sites/[domain]/area-collaboratore/page.tsx` | 94 | server sessione | S |
| `app/sites/[domain]/calendar-installation/page.tsx` | 43 | server sessione | S |
| `app/sites/[domain]/calendar-service/page.tsx` | 43 | server sessione | S |
| `app/sites/[domain]/calendar/page.tsx` | 127, 152 | server sessione | S |
| `app/sites/[domain]/documenti/page.tsx` | 48 | service | S |
| `app/sites/[domain]/errortracking/create/page.tsx` | 13 | service | S |
| `app/sites/[domain]/kanban/actions/archived-item-action.ts` | 40 | server sessione | U S |
| `app/sites/[domain]/kanban/actions/create-item.action.ts` | 106 | server sessione | I S |
| `app/sites/[domain]/kanban/actions/delete-kanban.action.ts` | 62, 100 | server sessione | U S |
| `app/sites/[domain]/kanban/actions/duplicate-item.action.ts` | 36, 78, 121 | server sessione | S I |
| `app/sites/[domain]/kanban/actions/get-kanbans.action.ts` | 23 | server sessione | S |
| `app/sites/[domain]/kanban/actions/save-kanban-state.action.ts` | 41 | server sessione | S |
| `app/sites/[domain]/kanban/actions/save-kanban.action.ts` | 225 | server sessione | S |
| `app/sites/[domain]/offerte/create/page.tsx` | 94 | server sessione | S |
| `app/sites/[domain]/products/[id]/page.tsx` | 35 | server sessione | S |
| `app/sites/[domain]/progetti/[id]/page.tsx` | 130 | server sessione | S |
| `app/sites/[domain]/projects/actions/archived-item-action.ts` | 17 | server sessione | U S I |
| `app/sites/[domain]/projects/actions/bulk-unarchive.action.ts` | 22 | server sessione | U S I |
| `app/sites/[domain]/projects/actions/create-batch.action.ts` | 210, 242 | server sessione | I S U |
| `app/sites/[domain]/projects/actions/create-item.action.ts` | 162, 193 | server sessione | I S U |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 92, 238 | server sessione | S D |
| `app/sites/[domain]/projects/actions/edit-item.action.ts` | 65, 128 | server sessione | S U |
| `app/sites/[domain]/timetracking/create/page.tsx` | 77 | server sessione | S |
| `lib/client-manager-summary.ts` | 107 | service | S |
| `lib/code-generator.ts` | 310, 615 | server sessione | S |
| `lib/country-dashboard.server.ts` | 45, 279 | server sessione | S |
| `lib/demo/service.ts` | 1538 | service | I S |
| `lib/documenti/create-offer-task-from-document.ts` | 155, 167 | misto | I S |
| `lib/personale/aggregate.ts` | 134 | server sessione | S |
| `lib/server-data.ts` | 504, 595, 886, 1153, 1491, 1562, 1752, 1821, 2401, 2669, 2699, 2739, 3515, 4166, 4195, 4736, 5282, 5388, 5551, 5744, 6091, 6430, 7157 | server sessione+service | S |
| `lib/wbs-data.server.ts` | 129, 373 | server sessione | S |
| `scripts/limit-momentum-projects.ts` | 124, 145, 206 | misto | D S |
| `scripts/santini-catalog-2026/rinnovo-ago-2026/rinnovo.mjs` | 118, 214, 405 | misto | U S |
| `scripts/santini-catalog-2026/rinnovo-ago-2026/verify-rinnovo.mjs` | 132 | misto | S |
| `scripts/seed-estrella-demo-data.ts` | 379, 536, 600 | misto | U S I |
| `scripts/seed-estrella.ts` | 1193, 1201 | misto | S I |
| `scripts/seed-formateria-projects.ts` | 130, 146, 162 | misto | S I |
| `scripts/seed-graf-projects.ts` | 232, 247, 265 | misto | S I |
| `scripts/seed-momentum-projects.ts` | 188, 203 | misto | S I |
| `scripts/seed-scherman.ts` | 1204, 1212 | misto | S I |
| `scripts/seed-suisseframe-projects.ts` | 208, 222 | misto | S I |
| `scripts/zztest-fatturazione-readiness.ts` | 43, 54, 83 | server sessione+misto | S D I |
| `utils/unique-code.ts` | 27 | misto | S |

### `Client` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 771, 819 | server sessione | S D |
| `app/api/clients/import-csv/route.ts` | 191, 353, 375 | server sessione | S U I |
| `app/api/clients/route.ts` | 49, 149 | server sessione | S I |
| `app/api/clients/search/route.ts` | 36 | server sessione | S |
| `app/api/kanban/tasks/route.ts` | 183 | server sessione | S |
| `app/api/quick-actions/data/route.ts` | 58 | server sessione | S |
| `app/api/reports/client/route.ts` | 51 | service | S |
| `app/api/sites/[domain]/clients/[id]/logo/route.ts` | 84 | server sessione | U |
| `app/api/sites/[domain]/country-presence/route.ts` | 33 | server sessione | S |
| `app/api/voice-input/command/route.ts` | 468 | server sessione | S |
| `app/api/voice-input/extract/route.ts` | 122 | server sessione | S |
| `app/sites/[domain]/clients/actions/create-item.action.ts` | 98 | server sessione | I S |
| `app/sites/[domain]/clients/actions/delete-item.action.ts` | 10, 28 | server sessione | D |
| `app/sites/[domain]/clients/actions/edit-item.action.ts` | 56 | server sessione | U |
| `app/sites/[domain]/documenti/page.tsx` | 36 | service | S |
| `app/sites/[domain]/offerte/create/page.tsx` | 77 | server sessione | S |
| `app/sites/[domain]/progetti/[id]/page.tsx` | 152 | server sessione | S |
| `app/sites/[domain]/projects/actions/create-batch.action.ts` | 93, 155 | server sessione | S I |
| `lib/country-dashboard.server.ts` | 43, 259 | server sessione | S |
| `lib/demo/service.ts` | 806 | service | I S |
| `lib/documenti/search-tools.ts` | 60, 92 | misto | S |
| `lib/personale/aggregate.ts` | 195 | server sessione | S |
| `lib/server-data.ts` | 160, 486, 1121, 1839, 2805 | server sessione | S |
| `lib/wbs-data.server.ts` | 464 | server sessione | S |
| `modules/clients/service/get.ts` | 13 | browser | S |
| `modules/clients/service/list.ts` | 18 | browser | S |
| `scripts/seed-estrella-clients-resellers.ts` | 95, 114 | misto | S I |
| `scripts/seed-estrella-demo-data.ts` | 435, 448 | misto | S I |
| `scripts/seed-estrella.ts` | 693, 705 | misto | S I |
| `scripts/seed-graf-projects.ts` | 158, 186, 204 | misto | S I |
| `scripts/seed-momentum-projects.ts` | 125, 149 | misto | S I |
| `scripts/seed-scherman.ts` | 679, 691 | misto | S I |
| `scripts/seed-suisseframe-projects.ts` | 118, 138, 147 | server sessione+misto | S I |
| `scripts/seed-suisseframe.ts` | 618, 626 | misto | S I |

### `Kanban` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 584, 681, 688 | server sessione | S U D |
| `app/api/debug/kanbans/route.ts` | 14 | server sessione | S |
| `app/api/kanban/[slug]/columns/route.ts` | 34 | server sessione | S |
| `app/api/kanban/[slug]/route.ts` | 29 | server sessione | S |
| `app/api/kanban/tasks/create/route.ts` | 150, 193 | server sessione | S |
| `app/api/kanban/tasks/route.ts` | 89 | server sessione | S |
| `app/api/quick-actions/data/route.ts` | 68 | server sessione | S |
| `app/api/settings/production-routing/route.ts` | 44 | server sessione | S |
| `app/api/settings/site-summary/route.ts` | 47 | server sessione | S |
| `app/api/tasks/generate-code/route.ts` | 40, 285 | server sessione | S |
| `app/api/voice-input/command/route.ts` | 474 | server sessione | S |
| `app/sites/[domain]/area-collaboratore/page.tsx` | 112 | server sessione | S |
| `app/sites/[domain]/calendar-installation/page.tsx` | 65 | server sessione | S |
| `app/sites/[domain]/calendar-service/page.tsx` | 65 | server sessione | S |
| `app/sites/[domain]/calendar/page.tsx` | 80 | server sessione | S |
| `app/sites/[domain]/kanban/actions/create-item.action.ts` | 63 | server sessione | S |
| `app/sites/[domain]/kanban/actions/delete-kanban-category.action.ts` | 34 | server sessione | S |
| `app/sites/[domain]/kanban/actions/delete-kanban.action.ts` | 26, 135 | server sessione | S D |
| `app/sites/[domain]/kanban/actions/duplicate-kanban-category.action.ts` | 79, 106, 121 | server sessione | S I |
| `app/sites/[domain]/kanban/actions/duplicate-kanban.action.ts` | 28, 47, 60 | server sessione | S I |
| `app/sites/[domain]/kanban/actions/get-kanban-categories.action.ts` | 117 | server sessione | S |
| `app/sites/[domain]/kanban/actions/get-kanbans.action.ts` | 87 | server sessione | S |
| `app/sites/[domain]/kanban/actions/save-kanban-card-config.action.ts` | 59 | server sessione | U |
| `app/sites/[domain]/kanban/actions/save-kanban.action.ts` | 59, 101, 152 | server sessione | S U I |
| `app/sites/[domain]/offerte/create/page.tsx` | 50, 62 | server sessione | S |
| `app/sites/[domain]/projects/actions/create-batch.action.ts` | 56 | server sessione | S |
| `app/sites/[domain]/projects/actions/create-item.action.ts` | 87 | server sessione | S |
| `lib/code-generator.ts` | 756 | server sessione | S |
| `lib/country-dashboard.server.ts` | 275 | server sessione | S |
| `lib/demo/service.ts` | 1188, 1222 | service | I U |
| `lib/documenti/create-offer-task-from-document.ts` | 77 | misto | S |
| `lib/permissions.ts` | 204 | server sessione | S |
| `lib/server-data.ts` | 863, 880, 1463, 1849, 2642, 4149, 4678, 5161, 5734, 6009, 6338 | server sessione | S |
| `lib/wbs-data.server.ts` | 123 | server sessione | S |
| `scripts/assign-kanbans-to-categories.ts` | 78, 151 | misto | S U |
| `scripts/check-kanban-status.ts` | 62 | server sessione | S |
| `scripts/configure-category-colors.ts` | 46, 107, 122 | server sessione+misto | S U |
| `scripts/seed-estrella-demo-data.ts` | 502 | misto | S |
| `scripts/seed-estrella.ts` | 412, 424, 478 | misto | S I U |
| `scripts/seed-kanban-categories.ts` | 119, 162 | misto | S U |
| `scripts/seed-matteo-kanban.ts` | 112, 123 | misto | S I |
| `scripts/seed-momentum-kanbans.ts` | 144, 155, 159, 217, 223 | misto | S U I D |
| `scripts/seed-momentum-projects.ts` | 161 | misto | S |
| `scripts/seed-scherman.ts` | 393, 405, 459 | misto | S I U |
| `scripts/seed-suisseframe-projects.ts` | 99 | server sessione | S |
| `scripts/seed-suisseframe.ts` | 451, 463, 517 | misto | S I U |
| `scripts/translate-estrella.ts` | 153, 164 | server sessione | S U |
| `scripts/zztest-fatturazione-readiness.ts` | 62 | server sessione | S |

### `KanbanCategory` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/sites/[domain]/kanban/actions/delete-kanban-category.action.ts` | 54 | server sessione | D |
| `app/sites/[domain]/kanban/actions/duplicate-kanban-category.action.ts` | 28, 43, 56 | server sessione | S I |
| `app/sites/[domain]/kanban/actions/get-kanban-categories.action.ts` | 73 | server sessione | S |
| `app/sites/[domain]/kanban/actions/save-kanban-category.action.ts` | 46, 73, 108, 124 | server sessione | S U I |
| `lib/country-dashboard.server.ts` | 287 | server sessione | S |
| `lib/server-data.ts` | 2646, 5167, 5740 | server sessione | S |
| `scripts/assign-kanbans-to-categories.ts` | 62 | server sessione | S |
| `scripts/check-kanban-status.ts` | 40 | server sessione | S |
| `scripts/seed-estrella.ts` | 377, 389 | misto | S I |
| `scripts/seed-kanban-categories.ts` | 72, 99 | server sessione+misto | S I |
| `scripts/seed-matteo-kanban.ts` | 79, 87 | misto | S I |
| `scripts/seed-momentum-kanbans.ts` | 121 | misto | S |
| `scripts/seed-scherman.ts` | 358, 370 | misto | S I |
| `scripts/seed-suisseframe.ts` | 416, 428 | misto | S I |
| `scripts/translate-estrella.ts` | 141 | server sessione | U |

### `Timetracking` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 601 | server sessione | D |
| `app/(administration)/administration/projects/actions.ts` | 105 | server sessione | I |
| `app/api/kanban/tasks/[id]/route.ts` | 92 | server sessione | S |
| `app/api/kanban/tasks/route.ts` | 138, 148 | server sessione | S |
| `app/api/reports/project-consuntivo-summary/route.ts` | 81 | service | S |
| `app/api/reports/project-consuntivo/route.ts` | 123 | service | S |
| `app/api/reports/time/route.ts` | 491 | server sessione | S |
| `app/api/sites/[domain]/attendance/route.ts` | 56 | service | S |
| `app/api/tasks/[taskId]/time-summary/route.ts` | 36 | service | S |
| `app/api/time-tracking/create/route.ts` | 161 | server sessione | I S |
| `app/api/time-tracking/delete/route.ts` | 31 | server sessione | D |
| `app/api/time-tracking/my-entries/route.ts` | 55 | server sessione | S |
| `app/sites/[domain]/calendar-installation/page.tsx` | 81 | server sessione | S |
| `app/sites/[domain]/calendar-service/page.tsx` | 81 | server sessione | S |
| `app/sites/[domain]/calendar/page.tsx` | 50 | server sessione | S |
| `app/sites/[domain]/progetti/[id]/page.tsx` | 176 | server sessione | S |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 159 | server sessione | D |
| `app/sites/[domain]/timetracking/actions/create-item.action.ts` | 109 | server sessione | I S |
| `app/sites/[domain]/timetracking/actions/delete-item.action.ts` | 11 | server sessione | D |
| `app/sites/[domain]/timetracking/actions/edit-item.action.ts` | 54, 129 | server sessione+misto | S U |
| `app/sites/[domain]/timetracking/create/page.tsx` | 149, 197 | misto | S |
| `lib/collaborator-dashboard.server.ts` | 206 | service | S |
| `lib/demo/service.ts` | 1610 | service | I S |
| `lib/server-data.ts` | 1188, 1204, 1697, 2848, 6318 | server sessione | S |

### `Supplier` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 719, 757 | server sessione | S D |
| `app/api/reports/suppliers/route.ts` | 30 | service | S |
| `app/api/suppliers/import-csv/route.ts` | 154, 346, 369 | server sessione | S U I |
| `app/api/suppliers/route.ts` | 24 | service | S |
| `app/sites/[domain]/documenti/page.tsx` | 43 | service | S |
| `app/sites/[domain]/errortracking/create/page.tsx` | 24 | service | S |
| `app/sites/[domain]/kanban/actions/create-item.action.ts` | 119 | server sessione | S |
| `app/sites/[domain]/projects/actions/create-batch.action.ts` | 112 | server sessione | S |
| `app/sites/[domain]/suppliers/actions/create-item.action.ts` | 64 | service | I S |
| `app/sites/[domain]/suppliers/actions/delete-item.action.ts` | 40 | service | D |
| `app/sites/[domain]/suppliers/actions/edit-item.action.ts` | 65 | service | U S |
| `lib/demo/service.ts` | 948 | service | I S |
| `lib/inventory-suppliers.ts` | 14 | service | S |
| `lib/personale/aggregate.ts` | 202 | server sessione | S |
| `lib/server-data.ts` | 215, 560, 1803 | service | S |

### `Product` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 700, 708, 745 | server sessione | S D U |
| `app/api/products/route.ts` | 35 | server sessione | S |
| `lib/server-data.ts` | 965 | server sessione | S |

### `Product_category` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/sites/[domain]/errortracking/create/page.tsx` | 28 | service | S |
| `lib/server-data.ts` | 653 | server sessione | S |

### `Department` — ondata A

Nessun accesso trovato nel codice.


### `Exit_checklist` — ondata A

Nessun accesso trovato nel codice.


### `PackingControl` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 620, 634 | server sessione | S D |
| `app/api/kanban/snapshot/route.ts` | 66 | server sessione | S |
| `app/api/kanban/tasks/move/route.ts` | 626 | server sessione | I S |
| `app/api/kanban/tasks/route.ts` | 204 | server sessione | S |
| `app/sites/[domain]/boxing/page.tsx` | 16 | server sessione | S |
| `app/sites/[domain]/progetti/[id]/page.tsx` | 220 | misto | S |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 111, 227 | server sessione | S D |
| `lib/server-data.ts` | 1225, 1813 | server sessione+service | S |
| `scripts/limit-momentum-projects.ts` | 92 | misto | S D |

### `PackingMasterItem` — ondata A

Nessun accesso trovato nel codice.


### `QcMasterItem` — ondata A

Nessun accesso trovato nel codice.


### `QualityControl` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 638, 652 | server sessione | S D |
| `app/api/kanban/snapshot/route.ts` | 59 | server sessione | S |
| `app/api/kanban/tasks/move/route.ts` | 584 | server sessione | I S |
| `app/api/kanban/tasks/route.ts` | 198 | server sessione | S |
| `app/sites/[domain]/progetti/[id]/page.tsx` | 206 | misto | S |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 135, 216 | server sessione | S D |
| `lib/server-data.ts` | 1224, 1732, 1805 | server sessione+service | S |
| `scripts/limit-momentum-projects.ts` | 102 | misto | S D |

### `site_modules` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 883, 2497, 2550 | server sessione | D S I+U |
| `app/(administration)/administration/sites/actions.ts` | 89, 99 | server sessione | S I |
| `app/api/settings/site-summary/route.ts` | 44 | server sessione | S |
| `app/api/sites/[domain]/modules/route.ts` | 30, 170 | server sessione | S I+U |
| `app/sites/[domain]/timetracking/create/page.tsx` | 297 | server sessione | S |
| `lib/demo/service.ts` | 428 | service | I+U |
| `lib/server-data.ts` | 1912 | server sessione | S |
| `scripts/seed-estrella-demo-data.ts` | 769 | misto | I+U |
| `scripts/seed-matteo-kanban.ts` | 180, 187, 190 | misto | S I U |
| `scripts/seed-momentum.ts` | 87, 94, 98 | misto | S I U |
| `services/assistants/context-builder.service.ts` | 25 | server sessione | S |

### `inventory_categories` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/api/inventory/categories/[id]/image/route.ts` | 35, 69, 189, 278 | service | S U |
| `app/api/inventory/categories/[id]/subcategories/image/route.ts` | 91 | service | S |
| `app/api/inventory/categories/[id]/subcategories/reorder/route.ts` | 64 | service | S |
| `app/api/inventory/categories/reorder/route.ts` | 52 | service | U |
| `app/api/inventory/categories/route.ts` | 35, 86, 162, 252, 259 | service | S I U D |
| `app/api/products/import-csv/route.ts` | 229, 324 | server sessione | S I |
| `app/api/settings/site-summary/route.ts` | 49 | server sessione | S |
| `app/sites/[domain]/categories/actions/create-item.action.ts` | 40, 50 | service | S I |
| `app/sites/[domain]/categories/actions/create-subcategory.action.ts` | 43 | service | S |
| `app/sites/[domain]/categories/actions/delete-item.action.ts` | 51, 58 | service | S D |
| `app/sites/[domain]/categories/actions/edit-item.action.ts` | 51 | service | U S |
| `lib/demo/service.ts` | 1692 | service | I S |
| `lib/personale/aggregate.ts` | 307 | server sessione | S |
| `lib/server-data.ts` | 1038, 1834, 1984, 6890 | server sessione+service | S |
| `lib/wbs-data.server.ts` | 514 | server sessione | S |
| `scripts/copy-scherman-images-from-santini.ts` | 291, 297, 322, 392, 410, 432, 555 | misto+server sessione | S U |
| `scripts/seed-estrella.ts` | 1300, 1312, 1329, 1341 | misto | S I |
| `scripts/seed-scherman.ts` | 1314, 1326, 1343, 1355 | misto | S I |
| `scripts/seed-suisseframe-inventory.ts` | 146, 158 | misto | S I |
| `scripts/seed-suisseframe.ts` | 753, 765, 782, 794 | misto | S I |

### `inventory_items` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/api/inventory/categories/route.ts` | 227 | service | S |
| `app/api/inventory/items/[id]/route.ts` | 35, 147, 247, 302 | server sessione | S U D |
| `app/api/inventory/items/route.ts` | 34, 156, 220 | server sessione | S I D |
| `app/api/products/import-csv/route.ts` | 272, 500 | server sessione | S I |
| `app/api/reports/inventory/route.ts` | 132 | service | S |
| `app/api/settings/site-summary/route.ts` | 53 | server sessione | S |
| `app/sites/[domain]/categories/actions/delete-item.action.ts` | 33 | service | S |
| `app/sites/[domain]/inventory/actions/create-item.action.ts` | 37, 98 | server sessione+misto | I D |
| `app/sites/[domain]/inventory/actions/delete-item.action.ts` | 15, 22 | server sessione | S D I |
| `app/sites/[domain]/inventory/actions/edit-item.action.ts` | 35, 315, 362 | server sessione | U S I |
| `lib/demo/service.ts` | 1826 | service | I S |
| `lib/personale/aggregate.ts` | 161 | server sessione | S |
| `lib/server-data.ts` | 984, 1970, 6867 | server sessione | S |
| `lib/wbs-data.server.ts` | 509 | server sessione | S |
| `scripts/copy-scherman-images-from-santini.ts` | 451 | misto | S |
| `scripts/seed-estrella.ts` | 1464, 1474 | misto | S I |
| `scripts/seed-scherman.ts` | 1462, 1472 | misto | S I |
| `scripts/seed-suisseframe-inventory.ts` | 203, 213 | misto | S I |

### `inventory_item_variants` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/api/inventory/items/[id]/route.ts` | 214, 227 | server sessione | S U |
| `app/api/inventory/items/route.ts` | 198 | server sessione | I |
| `app/api/products/import-csv/route.ts` | 208, 452, 532 | server sessione | S U I |
| `app/sites/[domain]/inventory/actions/create-item.action.ts` | 76 | misto | I |
| `app/sites/[domain]/inventory/actions/delete-item.action.ts` | 62, 73, 84 | server sessione | S D I |
| `app/sites/[domain]/inventory/actions/edit-item.action.ts` | 77, 90, 143, 229 | misto+server sessione | S U |
| `lib/demo/service.ts` | 1891 | service | I S |
| `scripts/copy-scherman-images-from-santini.ts` | 456, 486 | misto | S U |
| `scripts/seed-estrella.ts` | 1497, 1507 | misto | S I |
| `scripts/seed-scherman.ts` | 1495, 1505 | misto | S I |
| `scripts/seed-suisseframe-inventory.ts` | 235, 249 | misto | S I |

### `inventory_suppliers` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/api/inventory/suppliers/route.ts` | 88 | service | I |
| `app/api/products/import-csv/route.ts` | 251, 372 | server sessione | S I |
| `app/sites/[domain]/inventory/actions/edit-item.action.ts` | 330, 345 | server sessione | S I |
| `lib/demo/service.ts` | 1735 | service | I S |
| `lib/inventory-suppliers.ts` | 65, 82 | service | I+U S |
| `lib/server-data.ts` | 1057, 1990 | server sessione | S |
| `scripts/seed-estrella.ts` | 1256, 1268 | misto | S I |
| `scripts/seed-scherman.ts` | 1267, 1279 | misto | S I |
| `scripts/seed-suisseframe-inventory.ts` | 171, 183 | misto | S I |

### `inventory_warehouses` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/api/inventory/warehouses/route.ts` | 33, 83 | server sessione | S I |
| `lib/demo/service.ts` | 1778 | service | I S |
| `lib/server-data.ts` | 1092, 1999 | server sessione | S |
| `scripts/seed-estrella.ts` | 1224, 1234 | misto | S I |
| `scripts/seed-scherman.ts` | 1235, 1245 | misto | S I |
| `scripts/seed-suisseframe-inventory.ts` | 117, 127 | server sessione | S I |
| `scripts/seed-suisseframe.ts` | 714, 722 | misto | S I |

### `inventory_subcategory_images` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/api/inventory/categories/[id]/subcategories/image/route.ts` | 112, 143, 217, 232 | service | S I+U D |
| `app/api/inventory/categories/[id]/subcategories/reorder/route.ts` | 86, 106, 125 | service | S U I |
| `app/sites/[domain]/categories/actions/create-subcategory.action.ts` | 54, 66, 77 | service | S I |
| `lib/server-data.ts` | 2163 | server sessione | S |
| `scripts/copy-scherman-images-from-santini.ts` | 344, 371 | misto | S I+U |

### `Action` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 613, 706, 809 | server sessione | D S |
| `app/api/clients/import-csv/route.ts` | 410 | server sessione | I |
| `app/api/clients/route.ts` | 162 | server sessione | I |
| `app/api/error-tracking/create/route.ts` | 86 | server sessione | I S |
| `app/api/inventory/uniqueId/[id]/route.ts` | 52 | server sessione | I S |
| `app/api/kanban/tasks/altro/route.ts` | 92 | server sessione | I S |
| `app/api/kanban/tasks/create/route.ts` | 545 | server sessione | I S |
| `app/api/kanban/tasks/ferramenta/route.ts` | 102 | server sessione | I S |
| `app/api/kanban/tasks/legno/route.ts` | 92 | server sessione | I S |
| `app/api/kanban/tasks/metalli/route.ts` | 102 | server sessione | I S |
| `app/api/kanban/tasks/move/route.ts` | 669, 780 | server sessione | I S |
| `app/api/kanban/tasks/stoccato/route.ts` | 71 | server sessione | I |
| `app/api/kanban/tasks/vernice/route.ts` | 92 | server sessione | I S |
| `app/api/manufacturers/import-csv/route.ts` | 402 | server sessione | I |
| `app/api/products/import-csv/route.ts` | 595 | server sessione | I |
| `app/api/sell-products/import-csv/route.ts` | 443 | server sessione | I |
| `app/api/sell-products/route.ts` | 166 | server sessione | I |
| `app/api/suppliers/import-csv/route.ts` | 404 | server sessione | I |
| `app/api/tasks/[taskId]/history/route.ts` | 22 | server sessione | S |
| `app/api/tasks/[taskId]/notes/route.ts` | 161 | server sessione | I |
| `app/api/time-tracking/create/route.ts` | 200 | server sessione | I S |
| `app/sites/[domain]/clients/actions/create-item.action.ts` | 113 | server sessione | I |
| `app/sites/[domain]/clients/actions/edit-item.action.ts` | 98 | server sessione | I |
| `app/sites/[domain]/errortracking/actions/edit-item.action.ts` | 66 | server sessione | I |
| `app/sites/[domain]/inventory/actions/create-item.action.ts` | 126 | misto | I |
| `app/sites/[domain]/inventory/actions/delete-item.action.ts` | 33, 95 | server sessione | I |
| `app/sites/[domain]/inventory/actions/edit-item.action.ts` | 103, 187, 277, 371 | misto+server sessione | I |
| `app/sites/[domain]/kanban/actions/archived-item-action.ts` | 76 | server sessione | I |
| `app/sites/[domain]/kanban/actions/create-item.action.ts` | 153 | server sessione | I |
| `app/sites/[domain]/kanban/actions/duplicate-item.action.ts` | 213 | server sessione | I |
| `app/sites/[domain]/manufacturer-categories/actions/create-item.action.ts` | 75 | service | I |
| `app/sites/[domain]/manufacturer-categories/actions/edit-item.action.ts` | 57 | service | I |
| `app/sites/[domain]/manufacturers/actions/create-item.action.ts` | 75 | server sessione | I |
| `app/sites/[domain]/manufacturers/actions/delete-item.action.ts` | 53 | server sessione | I |
| `app/sites/[domain]/manufacturers/actions/edit-item.action.ts` | 77 | server sessione | I |
| `app/sites/[domain]/product-categories/actions/create-item.action.ts` | 83 | service | I |
| `app/sites/[domain]/product-categories/actions/edit-item.action.ts` | 50 | server sessione | I |
| `app/sites/[domain]/products/actions/create-item.action.ts` | 109 | misto | I |
| `app/sites/[domain]/products/actions/delete-item.action.ts` | 73, 184 | server sessione | I |
| `app/sites/[domain]/products/actions/duplicate-item.action.ts` | 78 | misto | I |
| `app/sites/[domain]/products/actions/edit-item.action.ts` | 116 | misto | I |
| `app/sites/[domain]/products/actions/update-image.action.ts` | 56 | server sessione | I |
| `app/sites/[domain]/projects/actions/archived-item-action.ts` | 27 | server sessione | I |
| `app/sites/[domain]/projects/actions/bulk-unarchive.action.ts` | 37 | server sessione | I |
| `app/sites/[domain]/projects/actions/create-batch.action.ts` | 257 | server sessione | I |
| `app/sites/[domain]/projects/actions/create-item.action.ts` | 224 | server sessione | I |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 194, 266 | server sessione | D I |
| `app/sites/[domain]/projects/actions/edit-item.action.ts` | 184 | server sessione | I |
| `app/sites/[domain]/resellers/actions/create-item.action.ts` | 74 | server sessione | I |
| `app/sites/[domain]/resellers/actions/delete-item.action.ts` | 48 | server sessione | I |
| `app/sites/[domain]/resellers/actions/edit-item.action.ts` | 75 | server sessione | I |
| `app/sites/[domain]/supplier-categories/actions/create-item.action.ts` | 89 | service | I |
| `app/sites/[domain]/supplier-categories/actions/edit-item.action.ts` | 62 | service | I |
| `app/sites/[domain]/suppliers/actions/create-item.action.ts` | 77 | service | I |
| `app/sites/[domain]/suppliers/actions/delete-item.action.ts` | 57 | service | I |
| `app/sites/[domain]/suppliers/actions/edit-item.action.ts` | 79 | service | I |
| `app/sites/[domain]/timetracking/actions/create-item.action.ts` | 163 | misto | I |
| `app/sites/[domain]/timetracking/actions/edit-item.action.ts` | 181 | misto | I |
| `lib/server-data.ts` | 177, 233, 826, 1229 | server sessione+service | S |

### `Errortracking` — ondata A

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 616, 736 | server sessione | D S U |
| `app/api/error-tracking/create/route.ts` | 51 | server sessione | I |
| `app/api/reports/errors/route.ts` | 45 | server sessione | S |
| `app/api/reports/project-consuntivo-summary/route.ts` | 99 | service | S |
| `app/api/reports/project-consuntivo/route.ts` | 144 | service | S |
| `app/sites/[domain]/errortracking/actions/create-item.action.ts` | 77 | server sessione | I S |
| `app/sites/[domain]/errortracking/actions/delete-item.action.ts` | 24 | service | D |
| `app/sites/[domain]/errortracking/actions/edit-item.action.ts` | 47 | service | U |
| `app/sites/[domain]/progetti/[id]/page.tsx` | 193 | misto | S |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 205 | server sessione | D |
| `lib/server-data.ts` | 1767 | service | S |
| `modules/errorTrackings/services/get.ts` | 13 | browser | S |
| `modules/errorTrackings/services/list.ts` | 18, 30 | browser | S |

### `KanbanColumn` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 672 | server sessione | D U |
| `app/api/debug/kanbans/route.ts` | 22 | server sessione | S |
| `app/api/kanban-columns/[kanbanId]/route.ts` | 25 | server sessione | S |
| `app/api/kanban/[slug]/columns/route.ts` | 53 | server sessione | S |
| `app/api/kanban/[slug]/route.ts` | 45 | server sessione | S |
| `app/api/kanban/tasks/[id]/route.ts` | 341 | server sessione | S |
| `app/api/kanban/tasks/create/route.ts` | 219, 243 | server sessione | S |
| `app/api/kanban/tasks/move/route.ts` | 156, 290, 428, 479, 531 | server sessione | S |
| `app/api/kanban/tasks/route.ts` | 171, 176 | server sessione | S |
| `app/api/settings/site-summary/route.ts` | 92 | server sessione | S |
| `app/api/tasks/notifications/route.ts` | 15 | server sessione | S |
| `app/api/voice-input/command/route.ts` | 500 | server sessione | S |
| `app/sites/[domain]/command-deck/attivita/page.tsx` | 125 | server sessione | S |
| `app/sites/[domain]/kanban/actions/create-item.action.ts` | 49 | server sessione | S |
| `app/sites/[domain]/kanban/actions/delete-kanban.action.ts` | 80, 119 | server sessione | S D |
| `app/sites/[domain]/kanban/actions/duplicate-kanban-category.action.ts` | 147 | server sessione | I |
| `app/sites/[domain]/kanban/actions/duplicate-kanban.action.ts` | 91 | server sessione | I |
| `app/sites/[domain]/kanban/actions/save-kanban.action.ts` | 176, 200, 238, 257, 290 | server sessione | S D U I |
| `app/sites/[domain]/projects/actions/create-batch.action.ts` | 79 | server sessione | S |
| `app/sites/[domain]/projects/actions/create-item.action.ts` | 51, 67 | server sessione | S |
| `app/sites/[domain]/projects/actions/edit-item.action.ts` | 45, 96 | server sessione | S |
| `lib/country-dashboard.server.ts` | 296 | server sessione | S |
| `lib/demo/service.ts` | 1227 | service | I |
| `lib/documenti/create-offer-task-from-document.ts` | 97 | misto | S |
| `lib/server-data.ts` | 2733, 4189, 4731, 5546, 5771, 6020 | server sessione | S |
| `scripts/seed-estrella-demo-data.ts` | 514 | misto | S |
| `scripts/seed-estrella.ts` | 454, 462, 818 | misto | S I |
| `scripts/seed-matteo-kanban.ts` | 145, 151 | misto | S I |
| `scripts/seed-momentum-kanbans.ts` | 182, 188, 222 | misto | S I D |
| `scripts/seed-momentum-projects.ts` | 167 | misto | S |
| `scripts/seed-scherman.ts` | 435, 443, 794 | misto | S I |
| `scripts/seed-suisseframe-projects.ts` | 108 | server sessione | S |
| `scripts/seed-suisseframe.ts` | 493, 501 | misto | S I |
| `scripts/translate-estrella.ts` | 176, 186 | misto | S U |
| `scripts/zztest-fatturazione-readiness.ts` | 72 | server sessione | S I |

### `TaskHistory` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 604 | server sessione | D |
| `app/api/kanban/available-snapshots/route.ts` | 20 | server sessione | S |
| `app/api/kanban/snapshot/route.ts` | 14 | server sessione | S |
| `app/sites/[domain]/kanban/actions/get-available-snapshots.action.ts` | 29, 42 | server sessione | S |
| `app/sites/[domain]/kanban/actions/save-kanban-state.action.ts` | 57, 105 | server sessione | S I |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 16, 40 | server sessione | S D |
| `lib/demo/service.ts` | 1545 | service | I |
| `scripts/limit-momentum-projects.ts` | 70, 78 | server sessione | S D |

### `TaskSupplier` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 607, 727 | server sessione | D |
| `app/api/kanban/tasks/route.ts` | 210 | server sessione | S |
| `app/api/tasks/[taskId]/suppliers/[supplierId]/route.ts` | 13 | server sessione | D S |
| `app/api/tasks/[taskId]/suppliers/route.ts` | 46, 77, 105, 141 | server sessione | S U I |
| `app/sites/[domain]/kanban/actions/create-item.action.ts` | 127 | server sessione | I |
| `app/sites/[domain]/kanban/actions/duplicate-item.action.ts` | 136, 141 | server sessione | S I |
| `app/sites/[domain]/progetti/[id]/page.tsx` | 167 | server sessione | S |
| `app/sites/[domain]/projects/actions/create-batch.action.ts` | 225 | server sessione | I |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 172 | server sessione | D |
| `lib/demo/service.ts` | 1556 | service | I |
| `lib/server-data.ts` | 578, 1234 | service+server sessione | S |

### `ClientAddress` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 800 | server sessione | D |

### `File` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 610 | server sessione | D |
| `app/api/files/[id]/route.ts` | 22, 46, 101 | server sessione | S D |
| `app/api/files/upload/route.ts` | 44 | server sessione | I S |
| `app/api/kanban/tasks/[id]/route.ts` | 124 | server sessione | S |
| `app/api/kanban/tasks/route.ts` | 194 | server sessione | S |
| `app/api/tasks/[taskId]/files/route.ts` | 22 | server sessione | S |
| `app/sites/[domain]/errortracking/actions/create-item.action.ts` | 93 | server sessione | U I |
| `app/sites/[domain]/errortracking/actions/delete-item.action.ts` | 19 | service | U D |
| `app/sites/[domain]/errortracking/actions/edit-item.action.ts` | 59 | server sessione | U I |
| `app/sites/[domain]/kanban/actions/duplicate-item.action.ts` | 159, 182 | server sessione | S I |
| `app/sites/[domain]/products/[id]/page.tsx` | 30 | server sessione | S |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 183 | server sessione | D |
| `lib/documenti/save-pdf-to-project-documents.ts` | 37, 49, 63 | misto | S U I |
| `lib/server-data.ts` | 531, 624, 1223, 2372, 2412 | server sessione | S |

### `PackingItem` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 628 | server sessione | D |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 123 | server sessione | D |
| `scripts/limit-momentum-projects.ts` | 97 | misto | D S |

### `Qc_item` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 646 | server sessione | D |
| `app/sites/[domain]/projects/actions/delete-item.action.ts` | 147 | server sessione | D |
| `scripts/limit-momentum-projects.ts` | 107 | misto | D |

### `_RolesToTimetracking` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 871 | server sessione | D |
| `app/api/time-tracking/create/route.ts` | 171 | server sessione | I |
| `app/api/time-tracking/delete/route.ts` | 20 | server sessione | D |
| `app/sites/[domain]/timetracking/actions/create-item.action.ts` | 125 | misto | I |
| `app/sites/[domain]/timetracking/actions/edit-item.action.ts` | 147, 153 | misto | D I |
| `lib/demo/service.ts` | 1626 | service | I |

### `_RolesToUser` — ondata B

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 869 | server sessione | D |
| `app/(administration)/administration/users/[id]/page.tsx` | 124 | server sessione | S |
| `app/api/reports/collaborators/route.ts` | 64 | service | S |
| `app/api/roles/[id]/route.ts` | 72 | server sessione | D |
| `app/api/users/[userId]/assigned-roles/route.ts` | 65 | server sessione | S |
| `app/api/users/[userId]/company-roles/route.ts` | 40, 122, 137, 196 | server sessione | S I D |
| `app/sites/[domain]/timetracking/create/page.tsx` | 115 | misto | S |
| `lib/collaborator-dashboard.server.ts` | 202 | service | S |
| `lib/demo/service.ts` | 1177 | service | I |
| `lib/server-data.ts` | 6639, 6736 | server sessione | S |
| `scripts/assign-test-roles.ts` | 42 | server sessione | I S |

### `Checklist_item` — ondata B

Nessun accesso trovato nel codice.


### `User` — ondata C

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 31, 314, 335, 985, 1133, 1183, 1218, 1322, 1412, 1438, 1553, 1894, 1938, 1994, 2232, 2256, 2276, 2577, 2632, 2668 | service+server sessione | S U I |
| `app/(administration)/administration/projects/actions.ts` | 92 | server sessione | S I |
| `app/(administration)/administration/sites/actions.ts` | 296, 310, 465 | server sessione | S |
| `app/(administration)/administration/users/[id]/page.tsx` | 115 | server sessione | S |
| `app/(administration)/administration/users/personal-manager.actions.ts` | 33, 44, 92, 139 | service | S U |
| `app/(auth)/auth/callback/route.ts` | 88 | server sessione | S |
| `app/(auth)/quick-login/data.ts` | 68, 109 | service | S |
| `app/api/assistants/avatar-upload/route.ts` | 22 | server sessione | S |
| `app/api/error-tracking/create/route.ts` | 28, 36 | server sessione | S |
| `app/api/kanban/tasks/[id]/route.ts` | 144 | server sessione | S |
| `app/api/kanban/tasks/route.ts` | 267 | server sessione | S |
| `app/api/quick-actions/data/route.ts` | 105 | server sessione | S |
| `app/api/reports/collaborators/route.ts` | 46 | service | S |
| `app/api/reports/time/route.ts` | 565, 603, 627 | server sessione | S |
| `app/api/settings/site-summary/route.ts` | 101 | server sessione | S |
| `app/api/sites/[domain]/ai-settings/route.ts` | 105, 268 | server sessione | S |
| `app/api/sites/[domain]/attendance/route.ts` | 86, 156, 172 | server sessione | S |
| `app/api/sites/[domain]/document-template/analyze/route.ts` | 41 | server sessione | S |
| `app/api/sites/[domain]/document-template/route.ts` | 17 | server sessione | S |
| `app/api/sites/[domain]/leave-requests/route.ts` | 58 | server sessione | S |
| `app/api/sites/[domain]/modules/route.ts` | 135 | server sessione | S |
| `app/api/sites/[domain]/users/[userId]/permissions/route.ts` | 55, 264 | server sessione | S U |
| `app/api/time-tracking/create/route.ts` | 91 | server sessione | S |
| `app/api/time-tracking/my-entries/route.ts` | 21 | server sessione | S |
| `app/api/users/[userId]/assigned-roles/route.ts` | 36 | server sessione | S |
| `app/api/users/[userId]/assistance-level/route.ts` | 47 | server sessione | U |
| `app/api/users/[userId]/company-roles/route.ts` | 25, 107, 181 | server sessione | S |
| `app/api/users/[userId]/delete/route.ts` | 50, 100, 179 | service+server sessione | S D |
| `app/api/users/[userId]/picture/route.ts` | 54, 88 | service | S U |
| `app/api/users/[userId]/toggle-status/route.ts` | 51 | server sessione | U |
| `app/launch/route.ts` | 106 | service | S |
| `app/sites/[domain]/area-collaboratore/page.tsx` | 71 | server sessione | S |
| `app/sites/[domain]/collaborators/actions.ts` | 127, 254, 342, 377, 457, 490, 539, 584, 657, 820, 848, 864 | server sessione+service | S U I |
| `app/sites/[domain]/command-deck/attivita/page.tsx` | 120 | server sessione | S |
| `app/sites/[domain]/errortracking/actions/create-item.action.ts` | 38, 46 | service | S |
| `app/sites/[domain]/timetracking/actions/create-item.action.ts` | 35, 144 | server sessione+misto | S |
| `app/sites/[domain]/timetracking/actions/edit-item.action.ts` | 42 | server sessione | S |
| `app/sites/[domain]/timetracking/create/page.tsx` | 104 | server sessione | S |
| `components/complete-signup.tsx` | 203, 224 | browser | S U |
| `components/home/invitation-handler.tsx` | 78 | browser | S |
| `components/home/top-bar-wrapper.tsx` | 11 | server sessione | S |
| `components/home/user-welcome.tsx` | 12 | server sessione | S |
| `components/sites-select/sites-grid.tsx` | 50 | service | S |
| `lib/auth-utils.ts` | 152, 169 | server sessione | S |
| `lib/collaborator-dashboard.server.ts` | 167 | service | S |
| `lib/demo/service.ts` | 491, 502 | service | I S U |
| `lib/manager-projects/queries.ts` | 133, 180 | server sessione | S |
| `lib/personal-manager/server-context.ts` | 30 | service | S |
| `lib/server-data.ts` | 1312, 1636, 1860, 3136, 6588, 6602 | server sessione | S |
| `lib/site-access.ts` | 10 | misto | S |
| `lib/wbs-data.server.ts` | 712 | server sessione | S |
| `scripts/assign-test-roles.ts` | 8 | server sessione | S |
| `scripts/create-superuser.ts` | 81 | misto | I |
| `scripts/delete-demo-users.ts` | 64, 120 | server sessione+misto | S D |
| `scripts/diagnose-site-access.ts` | 41 | server sessione | S |
| `scripts/limit-estrella-users-access.ts` | 97 | misto | S |
| `scripts/limit-momentum-collaborators.ts` | 103 | misto | S |
| `scripts/seed-benicchio-draft-collaborators.ts` | 134, 164 | misto | S I |
| `scripts/seed-bondini-draft-collaborators.ts` | 99, 131 | server sessione+misto | S I |
| `scripts/seed-estrella-demo-data.ts` | 627 | misto | S |
| `scripts/seed-estrella.ts` | 524, 552 | misto | S I |
| `scripts/seed-momentum.ts` | 104 | misto | S |
| `scripts/seed-scherman.ts` | 505, 533 | misto | S I |
| `scripts/seed-suisseframe.ts` | 563, 591 | misto | S I |
| `services/assistants/context-builder.service.ts` | 20 | server sessione | S |

### `sites` — ondata C

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 162, 205, 530, 554, 925, 945, 1790, 1831, 1842, 2102, 2120, 2138, 2171, 2194, 2208 | server sessione+service | S D U |
| `app/(administration)/administration/page.tsx` | 62, 77 | server sessione | S |
| `app/(administration)/administration/sites/actions.ts` | 25, 43, 55, 175, 225, 253, 363 | server sessione | S I U |
| `app/(administration)/administration/users/[id]/page.tsx` | 145 | server sessione | S |
| `app/api/clients/route.ts` | 101 | server sessione | S |
| `app/api/debug/basic/route.ts` | 66 | server sessione | S |
| `app/api/debug/site-flow/route.ts` | 131 | server sessione | S |
| `app/api/debug/site-lookup/route.ts` | 46, 58 | service | S |
| `app/api/debug/site-navigation/route.ts` | 84, 100 | server sessione | S |
| `app/api/debug/user-context/route.ts` | 151 | server sessione | S |
| `app/api/debug/vercel-env/route.ts` | 53 | service | S |
| `app/api/organizations/[id]/sites/route.ts` | 30 | server sessione | S |
| `app/api/reports/fatture-out-summary/route.ts` | 301 | service | S |
| `app/api/reports/project-summary/route.ts` | 158 | service | S |
| `app/api/settings/site-config/route.ts` | 81, 95 | server sessione | S |
| `app/api/site-images/[siteId]/route.ts` | 35, 121, 176, 198 | server sessione | S U |
| `app/api/site-logos/[siteId]/route.ts` | 28, 95, 144, 161 | server sessione | S U |
| `app/api/sites/[domain]/attendance/route.ts` | 125 | server sessione | S |
| `app/api/sites/[domain]/document-template/analyze/route.ts` | 119, 277 | server sessione | S U |
| `app/api/sites/[domain]/document-template/route.ts` | 59, 129 | server sessione | S U |
| `app/api/tasks/generate-code/route.ts` | 88, 332 | server sessione | S |
| `app/sites/[domain]/collaborators/actions.ts` | 68, 77 | server sessione | S |
| `app/sites/[domain]/projects/actions/create-batch.action.ts` | 44 | server sessione | S |
| `components/complete-signup.tsx` | 107 | browser | S |
| `lib/__tests__/listino-seed-live.test.ts` | 85 | server sessione | S |
| `lib/actions.ts` | 64, 108, 122, 167, 179, 217 | server sessione | I S U D |
| `lib/ai/get-site-ai-config.ts` | 67 | server sessione | S |
| `lib/auth-utils.ts` | 363, 369, 385 | server sessione | S |
| `lib/auth.ts` | 13 | server sessione | S |
| `lib/demo/service.ts` | 369, 1959, 2034, 2194 | service | S I |
| `lib/documenti/get-site-document-template.ts` | 19, 91 | server sessione | S |
| `lib/fetchers.ts` | 36, 72 | service | S |
| `lib/personale/aggregate.ts` | 55, 63 | service | S |
| `lib/server-data.ts` | 1587, 6507 | server sessione | S |
| `scripts/assign-kanbans-to-categories.ts` | 42 | server sessione | S |
| `scripts/check-kanban-status.ts` | 27 | server sessione | S |
| `scripts/check-momentum-map.ts` | 34 | server sessione | S |
| `scripts/copy-scherman-images-from-santini.ts` | 101 | misto | S |
| `scripts/create-test-site.ts` | 62 | misto | I S |
| `scripts/diagnose-site-access.ts` | 82 | misto | S |
| `scripts/fix-momentum-map-demo.ts` | 58 | misto | S |
| `scripts/fix-user-site-access.ts` | 39 | server sessione | S |
| `scripts/limit-estrella-users-access.ts` | 48, 104, 214 | server sessione+misto | S |
| `scripts/limit-momentum-collaborators.ts` | 54 | server sessione | S |
| `scripts/limit-momentum-projects.ts` | 130 | misto | S |
| `scripts/resize-benicchio-logo.ts` | 32, 97 | server sessione+misto | S U |
| `scripts/resize-suisseframe-logo.ts` | 38, 87 | server sessione+misto | S U |
| `scripts/santini-catalog-2026/armadi-cassone.mjs` | 349 | server sessione | S |
| `scripts/santini-catalog-2026/armadi-descrizioni.mjs` | 93 | server sessione | S |
| `scripts/santini-catalog-2026/consolida-porte.mjs` | 341 | server sessione | S |
| `scripts/santini-catalog-2026/consolida-serramenti.mjs` | 290 | server sessione | S |
| `scripts/santini-catalog-2026/import.mjs` | 113 | server sessione | S |
| `scripts/santini-catalog-2026/rinnovo-ago-2026/rinnovo.mjs` | 84 | server sessione | S |
| `scripts/santini-catalog-2026/seed-listino-test.mjs` | 326 | server sessione | S |
| `scripts/santini-catalog-2026/verify.mjs` | 120 | misto | S |
| `scripts/seed-benicchio-draft-collaborators.ts` | 73 | server sessione | S |
| `scripts/seed-command-deck-enabled.ts` | 62, 63 | server sessione | S |
| `scripts/seed-estrella-clients-resellers.ts` | 78 | misto | S |
| `scripts/seed-estrella-demo-data.ts` | 58 | server sessione | S |
| `scripts/seed-estrella.ts` | 292, 313, 360 | server sessione+misto | S I U |
| `scripts/seed-formateria-projects.ts` | 121 | misto | S |
| `scripts/seed-graf-projects.ts` | 146 | misto | S |
| `scripts/seed-kanban-categories.ts` | 49 | server sessione | S |
| `scripts/seed-matteo-kanban.ts` | 170 | misto | S |
| `scripts/seed-momentum-calendar.ts` | 139 | misto | S |
| `scripts/seed-momentum-kanbans.ts` | 206 | misto | S |
| `scripts/seed-momentum-projects.ts` | 111 | misto | S |
| `scripts/seed-momentum-real-events.ts` | 86 | misto | S |
| `scripts/seed-momentum.ts` | 53, 70 | server sessione | S I |
| `scripts/seed-scherman.ts` | 273, 294, 341 | server sessione+misto | S I U |
| `scripts/seed-suisseframe-inventory.ts` | 104 | server sessione | S |
| `scripts/seed-suisseframe-projects.ts` | 89 | server sessione | S |
| `scripts/seed-suisseframe.ts` | 331, 352, 399 | server sessione+misto | S I U |
| `scripts/set-formateria-logo.ts` | 41, 94 | server sessione+misto | S U |
| `scripts/set-momentum-logo.ts` | 35, 63 | server sessione | S U |
| `scripts/translate-estrella.ts` | 126 | server sessione | S |

### `organizations` — ondata C

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 54, 73, 89, 120, 149, 190, 234, 267, 296, 429, 450, 460, 496, 519, 564, 904, 1852 | service+server sessione | S I U D |
| `app/(administration)/administration/page.tsx` | 52, 100 | server sessione | S |
| `app/(administration)/administration/sites/actions.ts` | 235 | server sessione | S |
| `app/api/organizations/[id]/route.ts` | 31 | server sessione | S |
| `app/api/organizations/create/route.ts` | 43 | server sessione | I S |
| `app/api/organizations/join/route.ts` | 41 | server sessione | S |
| `app/api/sites/[domain]/document-template/route.ts` | 67 | server sessione | S |
| `components/complete-signup.tsx` | 39 | browser | S |
| `lib/auth-utils.ts` | 299 | server sessione | S |
| `lib/demo/service.ts` | 397, 1951, 2021 | service | S D I |
| `lib/documenti/get-site-document-template.ts` | 29, 101 | server sessione | S |
| `scripts/create-superuser.ts` | 20 | server sessione | I S |
| `scripts/create-test-site.ts` | 22, 42 | server sessione | S I |
| `scripts/limit-estrella-users-access.ts` | 61, 103 | server sessione+misto | S |
| `scripts/limit-momentum-collaborators.ts` | 67 | server sessione | S |
| `scripts/seed-estrella.ts` | 303 | server sessione | I S |
| `scripts/seed-momentum.ts` | 63 | server sessione | I S |
| `scripts/seed-scherman.ts` | 284 | server sessione | I S |
| `scripts/seed-suisseframe.ts` | 342 | server sessione | I S |

### `user_sites` — ondata C

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 878, 1358, 1372, 2023, 2109, 2158, 2294, 2309, 2319, 2337, 2351, 2369, 2381, 2423, 2482 | server sessione | D I S U |
| `app/(administration)/administration/sites/actions.ts` | 75, 84, 200, 265, 379, 388, 414, 429 | server sessione | S I D |
| `app/(administration)/administration/users/[id]/page.tsx` | 102 | server sessione | S |
| `app/(administration)/administration/users/page.tsx` | 45 | server sessione | S |
| `app/(auth)/auth/callback/route.ts` | 125, 185 | server sessione | S |
| `app/(auth)/quick-login/data.ts` | 45 | service | S |
| `app/api/quick-actions/data/route.ts` | 97 | server sessione | S |
| `app/api/reports/collaborators/route.ts` | 36 | service | S |
| `app/api/reports/time/route.ts` | 609 | server sessione | S |
| `app/api/settings/site-summary/route.ts` | 64 | server sessione | S |
| `app/api/sites/[domain]/ai-settings/route.ts` | 115, 278 | server sessione | S |
| `app/api/sites/[domain]/attendance/route.ts` | 118 | server sessione | S |
| `app/api/sites/[domain]/document-template/analyze/route.ts` | 49 | server sessione | S |
| `app/api/sites/[domain]/document-template/route.ts` | 25 | server sessione | S |
| `app/sites/[domain]/collaborators/actions.ts` | 111, 171, 186, 220, 407, 615 | server sessione | S I D |
| `app/sites/[domain]/layout.tsx` | 66 | server sessione | S |
| `components/home/invitation-handler.tsx` | 105 | browser | S |
| `lib/auth-utils.ts` | 377 | server sessione | S |
| `lib/collaborator-dashboard.server.ts` | 178 | service | S |
| `lib/demo/service.ts` | 559 | service | I+U |
| `lib/personale/aggregate.ts` | 42 | service | S |
| `lib/server-data.ts` | 1598, 1847, 2727, 6531 | server sessione+service | S |
| `lib/site-access.ts` | 18 | misto | S |
| `lib/wbs-data.server.ts` | 688 | server sessione | S |
| `scripts/diagnose-site-access.ts` | 150 | misto | S |
| `scripts/limit-estrella-users-access.ts` | 73, 133, 183, 199 | server sessione+misto | S D I |
| `scripts/limit-momentum-collaborators.ts` | 80, 189, 204, 218 | server sessione+misto | S D I |
| `scripts/seed-benicchio-draft-collaborators.ts` | 93, 100 | server sessione | S I |
| `scripts/seed-bondini-draft-collaborators.ts` | 58, 65 | server sessione | S I |
| `scripts/seed-estrella-demo-data.ts` | 617 | misto | S |
| `scripts/seed-estrella.ts` | 489, 496 | misto | S I |
| `scripts/seed-momentum.ts` | 109, 116 | misto | S I |
| `scripts/seed-scherman.ts` | 470, 477 | misto | S I |
| `scripts/seed-suisseframe.ts` | 528, 535 | misto | S I |

### `user_organizations` — ondata C

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 62, 109, 157, 179, 199, 394, 543, 966, 1031, 1077, 1084, 1092, 1111, 1152, 1162, 1275, 1333, 1347, 1390, 1470, 1506, 1518, 1559, 1572, 1598, 1617, 1649, 2035, 2238, 2248, 2617, 2689, 2703 | server sessione+service | S I D I+U |
| `app/(administration)/administration/organizations/[id]/page.tsx` | 45 | server sessione | S |
| `app/(administration)/administration/page.tsx` | 45 | server sessione | S |
| `app/(administration)/administration/sites/[id]/page.tsx` | 46 | server sessione | S |
| `app/(administration)/administration/sites/actions.ts` | 152, 285 | server sessione | S |
| `app/(administration)/administration/users/[id]/edit/page.tsx` | 51, 56, 83 | server sessione | S |
| `app/(administration)/administration/users/[id]/page.tsx` | 61, 66 | server sessione | S |
| `app/(administration)/administration/users/page.tsx` | 37 | server sessione | S |
| `app/(auth)/auth/callback/route.ts` | 115, 175 | server sessione | S |
| `app/(auth)/quick-login/data.ts` | 48 | service | S |
| `app/api/sites/[domain]/ai-settings/route.ts` | 122, 285 | server sessione | S |
| `app/api/sites/[domain]/attendance/route.ts` | 133 | server sessione | S |
| `app/api/sites/[domain]/document-template/analyze/route.ts` | 59 | server sessione | S |
| `app/api/sites/[domain]/document-template/route.ts` | 35 | server sessione | S |
| `app/sites/[domain]/collaborators/actions.ts` | 119, 400, 607 | server sessione | S I |
| `components/home/invitation-handler.tsx` | 94 | browser | S |
| `lib/auth-utils.ts` | 157, 324, 339 | server sessione | S |
| `lib/demo/service.ts` | 548 | service | I+U |
| `lib/personale/aggregate.ts` | 44 | service | S |
| `lib/server-data.ts` | 1610, 6544 | server sessione+service | S |
| `lib/site-access.ts` | 28 | misto | S |
| `scripts/diagnose-site-access.ts` | 58 | misto | S |
| `scripts/fix-user-site-access.ts` | 78, 106 | misto | S I |
| `scripts/limit-estrella-users-access.ts` | 77, 130, 176, 193 | server sessione+misto | S D I |
| `scripts/limit-momentum-collaborators.ts` | 82, 196, 211, 220 | misto | S D I |
| `scripts/seed-benicchio-draft-collaborators.ts` | 108, 115 | server sessione | S I |
| `scripts/seed-bondini-draft-collaborators.ts` | 73, 80 | server sessione | S I |
| `scripts/seed-estrella.ts` | 504, 511 | misto | S I |
| `scripts/seed-momentum.ts` | 120, 127 | misto | S I |
| `scripts/seed-scherman.ts` | 485, 492 | misto | S I |
| `scripts/seed-suisseframe.ts` | 543, 550 | misto | S I |

### `audit_logs` — ondata C

Nessun accesso trovato nel codice.


### `Roles` — ondata C

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/(administration)/administration/actions.ts` | 862, 873 | server sessione | S D |
| `app/(administration)/administration/users/[id]/page.tsx` | 131 | server sessione | S |
| `app/api/quick-actions/data/route.ts` | 119, 120 | server sessione | S |
| `app/api/reports/collaborators/route.ts` | 76 | service | S |
| `app/api/roles/[id]/route.ts` | 34, 86 | server sessione | U S D |
| `app/api/roles/route.ts` | 18, 60 | server sessione | S I |
| `app/api/users/[userId]/company-roles/route.ts` | 51 | server sessione | S |
| `app/api/voice-input/command/route.ts` | 1193 | server sessione | S |
| `app/sites/[domain]/errortracking/create/page.tsx` | 20 | service | S |
| `app/sites/[domain]/timetracking/create/page.tsx` | 126 | misto | S |
| `lib/collaborator-dashboard.server.ts` | 250 | service | S |
| `lib/demo/service.ts` | 443, 454 | service | I+U S |
| `lib/server-data.ts` | 1659, 1660, 6661, 6755 | server sessione | S |
| `scripts/assign-test-roles.ts` | 27 | server sessione | S |
| `scripts/create-test-roles.ts` | 19 | server sessione | I S |

### `inventory_units` — ondata C

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/api/inventory/units/route.ts` | 13 | server sessione | S |
| `app/api/products/import-csv/route.ts` | 264 | server sessione | S |
| `lib/server-data.ts` | 1075, 1995 | server sessione | S |
| `scripts/seed-estrella.ts` | 1360, 1366, 1372 | misto | S |
| `scripts/seed-scherman.ts` | 1374, 1380 | misto | S |
| `scripts/seed-suisseframe-inventory.ts` | 137 | server sessione | S |

### `attendance_entries` — ondata fix

| File | Righe | Client | Op. |
|---|---|---|---|
| `app/api/reports/time/route.ts` | 673 | server sessione | S |
| `app/api/sites/[domain]/attendance/route.ts` | 43, 341, 398 | service+server sessione | S I+U D |
| `app/api/sites/[domain]/leave-requests/[id]/route.ts` | 93 | server sessione | I+U |
| `lib/collaborator-dashboard.server.ts` | 214 | service | S |
| `lib/demo/service.ts` | 1643 | service | I+U I |
| `scripts/seed-estrella-demo-data.ts` | 698 | misto | I+U |