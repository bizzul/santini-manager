---

# Stream 7 - AI/Voice & UX Assistance

## Sommario esecutivo

Le integrazioni **LLM reali** sono concentrate in `app/api/voice-input/*` (`generateObject` da `ai` + `@ai-sdk/openai` / `@ai-sdk/anthropic`) e in `lib/ai/get-site-ai-config.ts` (config per `site_id` con fallback `OPENAI_API_KEY`). La **chat assistenti** (`/api/assistants/chat` + `AssistantChatOrchestratorService`) **non invoca modelli generativi**: costruisce prompt e metadata ma la risposta utente è **deterministica** (testo template con etichetta assistente). Non risultano **`streamText` / streaming** nel codebase. **Timeout espliciti** sulle chiamate AI/Whisper **non sono presenti**; in rete lenta o stallo provider la richiesta resta appesa fino ai limiti di runtime Vercel/Node. **Billing/usage per token** per tenant **non è implementato** (nessuna tabella o log strutturato usage lato LLM). **Isolamento tenant** sulle route voice: autenticazione utente sì, **verifica membership su `siteId`** no (diverso da `/api/assistants/chat`). **Vera/Aura/Mira** sono allineati in UI e orchestrator (saluto per agente, label dinamica); restano duplicazioni di logica routing pathname tra client e server. **Chiavi**: `OPENAI_API_KEY` solo server/env; chiavi opzionali per sito in `site_ai_settings` (BYOK). **GET** `ai-settings` **non richiede auth** e espone metadati sensibili (presenza chiave, ultimi 4 caratteri).

---

## Mappa integrazioni AI

| File | Modello | Input | Output | Timeout | Fallback |
|------|---------|--------|--------|---------|----------|
| `lib/ai/get-site-ai-config.ts` | Da `site_ai_settings` o default `gpt-4o-mini` | `site_id` (DB) | `provider`, `apiKey`, `model`, speech | Nessuno (lettura DB) | `OPENAI_API_KEY` env se riga assente o campi null |
| `app/api/voice-input/extract/route.ts` | Config sito (OpenAI/Anthropic) | `transcript`, `siteId` + schema Zod | JSON progetti estratti | Nessuno su `generateObject` | Errori API key / rate limit gestiti a messaggio (`104:208:app/api/voice-input/extract/route.ts`) |
| `app/api/voice-input/extract-timetracking/route.ts` | Idem | `transcript`, `siteId` | `registrazione` strutturata | Nessuno | 500 generico (`74:95:app/api/voice-input/extract-timetracking/route.ts`) |
| `app/api/voice-input/command/route.ts` | Idem | `transcript`, `siteId`, `context` | Comando strutturato + pipeline esecuzione | Nessuno | Chiarimenti se intent non ammesso (`419:433:app/api/voice-input/command/route.ts`) |
| `app/api/voice-input/transcribe/route.ts` | `whisper-1` (API OpenAI) | FormData audio + `siteId` | `transcript` | Nessuno su `fetch` Whisper (`64:72:app/api/voice-input/transcribe/route.ts`) | `whisperApiKey` o `apiKey` sito (`44:45:app/api/voice-input/transcribe/route.ts`) |
| `services/assistants/chat-orchestrator.service.ts` | **Nessun modello** | Messaggio utente + contesto | Risposta template + metadata | N/A | Testo fisso “deterministic output” (`145:148:services/assistants/chat-orchestrator.service.ts`) |
| `app/api/assistants/chat/route.ts` | N/A (delega orchestrator) | JSON body validato | JSON risposta | Nessuno esplicito | 500 con messaggio errore (`74:84:app/api/assistants/chat/route.ts`) |
| `app/api/assistants/route/route.ts` | Nessun LLM | Routing e contesto | JSON routing | Nessuno | Idem pattern errori |
| `app/api/quick-actions/data/route.ts` | Nessuno | Query `domain`, `type` | Dati form | Nessuno | N/A |

---

## Prompt audit

| File:linee | Prompt scope | Centralizzazione suggerita |
|------------|--------------|----------------------------|
| `config/assistants/prompt-templates.config.ts` `3:28` | System comune + ruoli Vera/Mira/Aura | Già centralizzato; unico riferimento per chat (prompt builder) |
| `services/assistants/prompt-builder.service.ts` `25:45` | Composizione runtime (sito, modulo, memoria, knowledge) | Logica centralizzata; output non inviato a LLM nella chat attuale |
| `app/api/voice-input/command/route.ts` `79:120+` | SYSTEM_PROMPT comandi vocali (intent, regole estrazione) | Spostare in `config/assistants/` o `lib/ai/prompts/` con versione |
| `app/api/voice-input/extract/route.ts` `18:38` | Estrazione progetti da trascrizione | Stesso pattern |
| `app/api/voice-input/extract-timetracking/route.ts` `10:24` | Estrazione ore | Stesso pattern |
| `components/assistance/GlobalSupportAssistant.tsx` `131:137` | Saluto “Ciao, sono {label}…” | UX string; ok in componente o i18n |
| `assistants/hub/AssistantRegistry.ts` `10:44` | Meta displayName (coerente con nomi) | Registry ok; **attenzione**: `sourceAssetPath` punta a path assoluti macchina (`28:30`, `42:44`) — non è “prompt” ma config errata in repo |

---

## Per-tenant billing gap

- Nessun uso di `usage` / token da risposta `generateObject` (Vercel AI SDK supporta usage in molti casi) né persistenza su DB per `site_id`.
- `site_ai_settings` (`lib/ai/get-site-ai-config.ts` `23:50`) memorizza provider/modello/chiavi, non metriche consumo.
- `AssistantMemoryService` usa `Map` in-memory (`9:69:services/assistants/memory.service.ts`): niente audit cross-process né billing.
- Gap **controllo accesso** su `siteId` nelle API voice: un utente autenticato potrebbe teoricamente invocare con `siteId` altrui e consumare chiave piattaforma (fallback env) o chiave BYOK del tenant — impatta anche **attribuzione costo**.

---

## Voice/Speech gaps

- **Timeout**: `fetch` Whisper e `generateObject` senza `AbortSignal` / deadline.
- **Retry/idempotenza**: assenti; comandi ripetuti possono creare duplicati lato business se l’esecuzione non è idempotente.
- **Permessi microfono**: `lib/speech/providers/web-speech.ts` `75:79` (feature detection); `whisper.ts` usa `getUserMedia` (`46:47`) con gestione errore generica.
- **Deepgram**: dichiarato in tipo (`lib/ai/get-site-ai-config.ts` `5`) ma `lib/speech/index.ts` `27:29` lancia “not yet implemented”.
- **Whisper client stub**: `lib/speech/providers/whisper.ts` documentato come stub; flussi UI reali usano spesso `/api/voice-input/transcribe` (server-side key).
- **Privacy**: audio e trascrizioni passano al server OpenAI quando si usa Whisper API (`64:72:app/api/voice-input/transcribe/route.ts`); testo utente nelle route `extract` / `command` va al provider LLM scelto. Nessuna informativa nel codice analizzato oltre messaggi UI generici.

---

## Security gap (chiavi, dati utente)

- `OPENAI_API_KEY` / chiavi sito solo lato server in `getSiteAiConfig` e route API — **non** in `NEXT_PUBLIC_*` (coerente con regole progetto).
- **GET** `/api/sites/[domain]/ai-settings` (`5:57:app/api/sites/[domain]/ai-settings/route.ts`): **nessuna autenticazione**; espone `hasAiApiKey`, `hasWhisperApiKey`, suffissi mascherati — **information disclosure** (enumerazione domini noti).
- **Voice routes**: `siteId` nel body **non** incrociato con `getUserSites()` (a differenza di `app/api/assistants/chat/route.ts` `55:65`) → rischio **cross-tenant** e **abuso quota** chiave piattaforma.
- `AssistantRegistry.ts`: path assoluti verso asset locali — rischio rottura deploy e leak di struttura filesystem in commit.

---

## Findings nuovi S7-F&lt;NN&gt;

| ID | Severity | Evidenza |
|----|----------|----------|
| **S7-F01** | high | Chiamate LLM/Whisper senza timeout esplicito (`generateObject`, `fetch` Whisper) |
| **S7-F02** | medium | Nessun retry/backoff né idempotenza chiave per chiamate LLM |
| **S7-F03** | high | Nessun tracking token/costo per `site_id`; impossibile billing o quota tenant |
| **S7-F04** | medium | Prompt voice lunghi duplicati nelle route invece di modulo condiviso in `lib/ai/` o `config/` |
| **S7-F05** | low (prodotto) | Chat assistenti senza inferenza LLM reale nonostante prompt builder e memoria (`145:148:services/assistants/chat-orchestrator.service.ts`) |
| **S7-F06** | critical | `app/api/voice-input/*` autentica utente ma **non** verifica accesso al `siteId` (vs `assistants/chat`) |
| **S7-F07** | medium | `GET .../ai-settings` senza auth; metadati chiavi esposti |
| **S7-F08** | medium | Memoria assistenti in-process (`Map`) — non adatta a multi-istanza / riavvii |
| **S7-F09** | low | `AssistantRegistry` con `sourceAssetPath` path assoluti dev machine |

---

## Quick wins

- Aggiungere **`assertUserCanAccessSite(siteId)`** (stesso pattern di `getUserSites` in `app/api/assistants/chat/route.ts`) a **tutte** le route sotto `app/api/voice-input/`.
- Proteggere **GET** `ai-settings` con sessione e stesso controllo membership usato in PUT/DELETE.
- Introdurre **`AbortSignal.timeout(ms)`** (o `Promise.race`) su `generateObject` e `fetch` Whisper.
- Estrarre stringhe **SYSTEM_PROMPT** voice in un unico modulo importato dalle route.

---

## Interventi strutturali

- Tabella (o pipeline) **usage**: `site_id`, provider, model, input/output token, timestamp, request id; oppure export da observability provider.
- **`maxDuration`** / budget runtime route Next per route AI pesanti; allineamento a piano Vercel.
- Persistenza **memoria assistenti** su storage condiviso (DB) se il prodotto richiede continuità.
- Completare o rimuovere **Deepgram** e chiarire strategia **Whisper** client vs server.
- Allineare **routing pathname** Vera/Mira/Aura in un’unica fonte condivisa tra `GlobalSupportAssistant` e `AssistantRouterService` per evitare drift.

---

## Contraddizioni con la roadmap

- `docs/AUDIT-ARCH-DATA-CHECKLISTS.md` Area D (`43:43`) chiede esplicitamente verifica **timeout, fallback e per-tenant billing** su voice / `get-site-ai-config`: **timeout e billing non sono soddisfatti**; fallback env sì per chiave.
- Il backlog `F-001` (service client + header) non copre l’AI, ma il **gap membership su `site_id`** nelle voice API è coerente con il tema “isolamento tenant” dell’audit generale.

---

## Domande aperte

- È previsto il **passaggio a LLM reale** per la chat (`orchestrate`) o resta orchestrazione deterministica?
- Policy **PII**: testi vocali e dati cliente nelle trascrizioni possono essere inviati a provider extra-UE? Serve DPIA / clausole contrattuali?
- Per siti **senza** BYOK, chi **sponsorizza** il costo `OPENAI_API_KEY` globale e come si applicano **quote** per tenant?

---

**Path citati** (assoluti):  
`/Users/matteopaolocci/santini-manager/lib/ai/get-site-ai-config.ts`,  
`/Users/matteopaolocci/santini-manager/app/api/voice-input/extract/route.ts`,  
`/Users/matteopaolocci/santini-manager/app/api/voice-input/extract-timetracking/route.ts`,  
`/Users/matteopaolocci/santini-manager/app/api/voice-input/command/route.ts`,  
`/Users/matteopaolocci/santini-manager/app/api/voice-input/transcribe/route.ts`,  
`/Users/matteopaolocci/santini-manager/services/assistants/chat-orchestrator.service.ts`,  
`/Users/matteopaolocci/santini-manager/app/api/assistants/chat/route.ts`,  
`/Users/matteopaolocci/santini-manager/services/assistants/memory.service.ts`,  
`/Users/matteopaolocci/santini-manager/app/api/sites/[domain]/ai-settings/route.ts`,  
`/Users/matteopaolocci/santini-manager/components/assistance/GlobalSupportAssistant.tsx`,  
`/Users/matteopaolocci/santini-manager/assistants/hub/AssistantRegistry.ts`,  
`/Users/matteopaolocci/santini-manager/lib/speech/index.ts`,  
`/Users/matteopaolocci/santini-manager/package.json` (righe `16:18`, `85`).
