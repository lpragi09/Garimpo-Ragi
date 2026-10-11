# Garimpo Futurista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar o Garimpo com visual futurista/realista, corrigir os bugs da auditoria, deixar a busca muito mais rápida, o site 100% responsivo, e somar recursos pra converter lead em cliente.

**Architecture:** Next.js 16 (App Router). Lógica pura em `src/lib/` testada com Vitest. Um design system novo em `src/components/fx/` (efeitos) + tokens em `globals.css`. A lógica da busca sai de `Garimpar.tsx` para um hook `src/app/useBusca.ts`, e a página vira só apresentação. Efeitos pesados (WebGL) carregam sob demanda e desligam em celular fraco / `prefers-reduced-motion`.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 5, Tailwind 4, Supabase, lucide-react, **ogl** (novo, WebGL leve ~30 kB), **Vitest** (novo, dev).

**Spec:** Sem documento de design (usuário pulou o brainstorming e pediu execução automática). Entradas: pedido do usuário ("design geral, bugs, overclock, totalmente responsivo e turbinado, totalmente futurista"), referências visuais (reactbits.dev, design.dev, 3 posts do Instagram), auditoria de bugs e auditoria de desempenho desta sessão. Todas as decisões abaixo são do Claude.

## Direção visual (decisão do Claude, a partir das referências)

- **Base:** preto profundo levemente azulado, camadas de vidro escuro, grão sutil por cima (realismo).
- **Realismo cromado (design.dev):** ícones dos nichos em "pastilhas" de metal cromado; títulos com texto em gradiente cromado.
- **Movimento (reactbits.dev):** fundo WebGL tipo aurora no hero; cards com *spotlight* que segue o mouse; botão principal com borda de luz animada; título com efeito "decrypt" ao aparecer; números contando.
- **Coreografia única (post do martim-pescador):** o hero anima **uma vez** na entrada — fundo acende, título decodifica, formulário sobe — e para. Nada fica em loop chamando atenção além da aurora lenta e da faixa marquee.
- **Tipografia gigante (posts "Websites in 2026"):** display `Space Grotesk` bem grande e apertado; palavras de destaque em `Playfair Display` itálico (só o itálico é carregado).
- **Cor de destaque:** mantém o verde neon `#0ae448` da marca; violeta e ciano só em brilhos.
- **Celular:** a navegação vira um **dock flutuante embaixo** (estilo iOS) em vez do menu hambúrguer.

## Global Constraints

- **Leia `AGENTS.md`:** este Next.js tem breaking changes — consulte `node_modules/next/dist/docs/` antes de usar qualquer API do Next (ex.: `proxy.ts` substitui middleware, `PageProps<"/rota">`, `next/dynamic`).
- Texto de interface, nomes e comentários em **português**, no estilo atual (`buscarOsm`, `salvarLead`, `ehCelular`).
- Dependências novas permitidas: **somente** `ogl` (produção) e `vitest` (dev). Nada de framer-motion, three.js, GSAP.
- Leads continuam funcionando **sem Supabase** (localStorage em dev).
- Banco: só migração nova (`supabase/migrations/002_*.sql`); nunca editar a `001`.
- Política do Nominatim: no máximo **1 requisição/s** (medida entre inícios de requisição).
- **Responsivo:** sem rolagem horizontal em 360 px; alvos de toque ≥ 44 px; testado em 360, 768, 1024 e 1440 px.
- **Movimento:** todo efeito respeita `prefers-reduced-motion: reduce` (estático) e o WebGL não roda em telas < 768 px nem com `navigator.hardwareConcurrency <= 4` (usa gradiente CSS estático). WebGL pausa fora da tela e com a aba escondida; DPR máximo 1,5.
- Ao fim de cada task: `npm test`, `npm run lint`, `npx tsc --noEmit` passando. Tasks que mexem em UI também `npm run build`.

## Review Focus

1. **Busca parcial + troca de busca no meio:** iniciar uma busca nova enquanto a anterior ainda chega não pode misturar resultados das duas. Teste em Task 3 (`useBusca` descarta parciais de busca antiga via id de busca).
2. **Celular fraco / reduced-motion:** a página tem que abrir e ser usável sem WebGL e sem animação. Verificado em Task 2 (teste de `podeAnimarPesado`) e na QA final.
3. **CSV com `;`, aspas e quebra de linha na anotação** abre certo no Excel pt-BR (separador `;`, BOM). Teste em Task 4.
4. **Lead antigo sem `proximo_contato`** e data "hoje" às 23h30 local não vira "atrasado". Teste em Task 4.
5. **Erro do servidor em HTML/texto** (504 da Vercel, 503 do proxy) vira mensagem legível em português. Teste em Task 1 (`lerRespostaJson`).

---

## Ordem de execução (ondas)

| Onda | Tasks (em paralelo dentro da onda) | Por quê |
|---|---|---|
| 1 | **T1** (Vitest + bugs de lógica) ‖ **T2** (design system) | Arquivos disjuntos; tudo depois usa os dois |
| 2 | **T3** (busca turbinada) ‖ **T4** (página de leads) ‖ **T6** (navegação, layout, login, auth) | Arquivos disjuntos |
| 3 | **T5** (página de busca redesenhada + card) | Depende do `useBusca` da T3 |

Cada task paralela roda em worktree próprio; o coordenador faz merge na branch `melhorias-futurista` no fim da onda.

---

### Task 1: Vitest + correções de lógica (bugs 2, 4, 6, 10, 11 e corpo `null`)

**Files:**
- Modify: `package.json` (devDep `vitest`, script `"test": "vitest run"`)
- Create: `vitest.config.ts` (`environment: "node"`, `include: ["src/**/*.test.ts"]`, alias `@` → `src`)
- Modify: `src/lib/contato.ts`, Create: `src/lib/contato.test.ts`
- Modify: `src/lib/fontes/site.ts`, Create: `src/lib/fontes/site.test.ts`
- Create: `src/lib/http.ts`, `src/lib/http.test.ts`
- Modify: `src/lib/fontes/osm.ts` (só: chave de duplicado, filtro de distrito, `SemAcesso` herda de `FonteErro`)
- Create: `src/lib/fontes/osm.test.ts`
- Modify: `src/lib/leads.ts` (só `salvarLead` local), `src/app/api/buscar/route.ts`, `src/lib/fontes/google.ts` (timeout)

**Interfaces:**
- Produces: `montarMensagem(modelo, { nome, cidade?, nicho? })` — `{nicho}` → nicho em minúsculas ou "seu negócio"; substituição com função (sem interpretar `$`).
- Produces: `linkBuscaInstagram(nome: string, cidade: string): string` em `site.ts` → `https://www.google.com/search?q=` + `encodeURIComponent(\`site:instagram.com "${nome}" ${cidade}\`)`.
- Produces: `lerRespostaJson<T>(res: Response): Promise<T>` em `http.ts` — lê `text()`, tenta `JSON.parse`; se falhar ou `!res.ok`, lança `Error` com `data.erro` ou mensagem por status: 504/408 → "A busca demorou demais. Tente de novo em 1 minuto."; 429/503 → "O mapa limitou as consultas. Tente de novo em 1 minuto."; outros → "Erro ao buscar.".
- Produces: `chaveEmpresa(e: Empresa): string` em `osm.ts` (exportada) = `e.telefone ? \`${nome minúsculo}|${telefone}\` : e.placeId`.
- Produces: `class SemAcesso extends FonteErro` com status `503` e a mensagem do limite acima.

- [ ] **Step 1:** `npm install -D vitest`; script `test`; `vitest.config.ts`.
- [ ] **Step 2: Testes que falham**

```ts
// contato.test.ts
expect(montarMensagem("{nome}", { nome: "Ca$h Barber$$ $' $&" })).toBe("Ca$h Barber$$ $' $&");
expect(montarMensagem("{nome} é {nicho}", { nome: "Zé", nicho: "Barbearia" })).toBe("Zé é barbearia");
expect(montarMensagem("{nome} é {nicho}", { nome: "Zé" })).toBe("Zé é seu negócio");
expect(montarMensagem("Oi {nome} de {cidade}", { nome: "Zé", cidade: null })).toBe("Oi Zé de sua cidade");
expect(ehCelular("(35) 99876-5432")).toBe(true); expect(ehCelular("(35) 3821-6855")).toBe(false);
expect(linkWhatsApp("(35) 99876-5432", "a b")).toBe("https://wa.me/5535998765432?text=a%20b");
// site.test.ts
expect(classificarSite("https://www.instagram.com/ze")).toBe("rede_social");
expect(classificarSite("https://barbeariadoze.com.br")).toBe("tem_site");
expect(classificarSite(null)).toBe("sem_site");
expect(linkBuscaInstagram("Zé & Cia #1", "Lavras, MG")).toBe("https://www.google.com/search?q=" + encodeURIComponent('site:instagram.com "Zé & Cia #1" Lavras, MG'));
// http.test.ts
await expect(lerRespostaJson(new Response("An error occurred", { status: 504 }))).rejects.toThrow("demorou demais");
await expect(lerRespostaJson(new Response('{"erro":"Faça login."}', { status: 401 }))).rejects.toThrow("Faça login.");
expect(await lerRespostaJson(new Response('{"a":1}'))).toEqual({ a: 1 });
// osm.test.ts
expect(chaveEmpresa(emp({ placeId: "osm-N-1", nome: "Barbearia Central", telefone: null })))
  .not.toBe(chaveEmpresa(emp({ placeId: "osm-N-2", nome: "Barbearia Central", telefone: null })));
expect(new SemAcesso()).toBeInstanceOf(FonteErro); expect(new SemAcesso().status).toBe(503);
```

- [ ] **Step 3:** `npm test` → FAIL nos novos.
- [ ] **Step 4: Implementar**
  - `contato.ts`: `replaceAll("{nome}", () => …)` etc.
  - `site.ts`: `linkBuscaInstagram`.
  - `http.ts`: `lerRespostaJson`.
  - `osm.ts`: `chaveEmpresa` substitui a chave do `vistos`; `acharCidade` devolve também `tipo` e o filtro por cidade (`semAcento(local) !== nomeCidade`) é pulado quando `tipo === "district"`; `SemAcesso extends FonteErro`.
  - `route.ts`: `const body = (await request.json().catch(() => null)) ?? {}` e só então ler campos (corpo `null`).
  - `google.ts`: `signal: AbortSignal.timeout(15_000)` no fetch.
  - `leads.ts` (`salvarLead`, ramo sem Supabase): se já existe lead com o `place_id`, **não faz nada** (igual ao `ignoreDuplicates`).
- [ ] **Step 5:** `npm test`, `npm run lint`, `npx tsc --noEmit` → OK.
- [ ] **Step 6: Commit** — `fix: corrige mensagem com $, duplicados, distrito, limite do mapa e respostas não-JSON; adiciona Vitest`

---

### Task 2: Design system futurista

**Files:**
- Modify: `package.json` (dep `ogl`)
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx` (só fontes e classe de grão; **não** mexe em Navbar)
- Create: `src/components/fx/movimento.ts`, `src/components/fx/movimento.test.ts`
- Create: `src/components/fx/Aurora.tsx`, `src/components/fx/AuroraFundo.tsx`
- Create: `src/components/fx/SpotlightCard.tsx`
- Create: `src/components/fx/PastilhaCromada.tsx`
- Create: `src/components/fx/TextoDecrypt.tsx`
- Create: `src/components/fx/Contador.tsx`
- Create: `src/components/fx/BotaoLuz.tsx`
- Modify: `src/components/ui.tsx` (`Chip` no novo visual; API igual)

**Interfaces:**
- Produces (tokens em `@theme`): `--color-ink: #05060a`, `--color-panel: #0b0d13`, `--color-panel-2: #11141c`, `--color-line: rgb(255 255 255 / 0.08)`, mantém `cream`, `muted`, `lime`, `lime-soft`, `amber`, `sky`, `violet`; `--font-display: var(--font-grotesk)`; `--font-serif: var(--font-playfair)`; `--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- Produces (utilitários CSS): `texto-cromado` (gradiente metálico `#ffffff → #c9ccd3 → #6b6f78 → #eef0f3`, `background-clip: text`), `vidro` (fundo `rgb(255 255 255/0.03)`, borda `--color-line`, `inset 0 1px 0 rgb(255 255 255/0.06)`; `backdrop-blur-xl` **só** a partir de `md`), `grao` (overlay `::after` fixo com ruído SVG em data-URI, opacidade 0.05, `pointer-events:none`), `grade-fundo` (linhas 1px a cada 48px com máscara radial), `borda-luz` (borda com `conic-gradient` girando via `@property --angulo`, 6s).
- Produces: `podeAnimarPesado(info: { largura: number; nucleos?: number; reduzMovimento: boolean }): boolean` em `movimento.ts` → `false` se `reduzMovimento`, `largura < 768` ou `nucleos !== undefined && nucleos <= 4`.
- Produces: `useReduzMovimento(): boolean` (hook em `movimento.ts`, lê `matchMedia` depois de montar; `true` no servidor).
- Produces: `<AuroraFundo className?: string />` — client; carrega `Aurora` com `next/dynamic` (`ssr: false`) **só** se `podeAnimarPesado`; caso contrário renderiza gradiente CSS estático (lime/violeta/ciano radial). `Aurora` usa `ogl` (shader de aurora com 3 cores `#0ae448`, `#9d95ff`, `#00bae2`, velocidade lenta), DPR `min(devicePixelRatio, 1.5)`, pausa com `IntersectionObserver` e `document.hidden`, faz cleanup do contexto no unmount.
- Produces: `<SpotlightCard as?: "article" | "div" | "li"; className?; children />` — atualiza `--mx/--my` no `pointermove` (sem re-render React) e desenha `radial-gradient(240px at var(--mx) var(--my), rgb(10 228 72 / 0.10), transparent)`.
- Produces: `<PastilhaCromada icon: LucideIcon; tamanho?: "sm" | "md" />` — tile arredondado com borda em gradiente cromado, interior escuro, ícone `text-cream` com `drop-shadow`.
- Produces: `<TextoDecrypt texto: string; className?; atrasoMs?: number />` — embaralha caracteres e revela da esquerda pra direita em ~700 ms, **uma vez** no mount; com reduced motion mostra o texto direto. `aria-label={texto}` e o conteúdo animado `aria-hidden`.
- Produces: `<Contador valor: number; className? />` — anima de valor anterior até `valor` em 600 ms com `requestAnimationFrame`; reduced motion → valor direto.
- Produces: `<BotaoLuz …ButtonHTMLAttributes />` — botão verde neon com `borda-luz` e brilho no hover; altura mínima 56 px.

- [ ] **Step 1: Teste que falha**

```ts
expect(podeAnimarPesado({ largura: 1440, nucleos: 8, reduzMovimento: false })).toBe(true);
expect(podeAnimarPesado({ largura: 1440, nucleos: 8, reduzMovimento: true })).toBe(false);
expect(podeAnimarPesado({ largura: 390, nucleos: 8, reduzMovimento: false })).toBe(false);
expect(podeAnimarPesado({ largura: 1440, nucleos: 4, reduzMovimento: false })).toBe(false);
expect(podeAnimarPesado({ largura: 1440, reduzMovimento: false })).toBe(true);
```
(Se a T1 ainda não instalou o Vitest no seu worktree, instale `vitest` igual à T1 — o merge resolve o `package.json`.)

- [ ] **Step 2:** `npx vitest run src/components/fx` → FAIL.
- [ ] **Step 3:** Implementar `movimento.ts` → PASS.
- [ ] **Step 4:** `npm install ogl`. Fontes no `layout.tsx`: `Inter` (`--font-inter`), `Space_Grotesk` (`--font-grotesk`), `Playfair_Display` **só** `style: ["italic"]` (`--font-playfair`); remover `JetBrains_Mono`. Adicionar `grao` no `<body>`.
- [ ] **Step 5:** `globals.css` com tokens e utilitários acima; manter `animate-marquee`, `animate-rise`, `no-scrollbar` e o bloco `prefers-reduced-motion`.
- [ ] **Step 6:** Componentes `fx/*` e novo visual do `Chip` (vidro, ativo = fundo creme com texto ink, `min-h-11`).
- [ ] **Step 7:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` → OK.
- [ ] **Step 8: Commit** — `feat: design system futurista (aurora WebGL, vidro, cromado, spotlight, decrypt)`

---

### Task 3: Busca turbinada (resultados ao vivo, mais rápida, com cache)

**Files:**
- Modify: `src/lib/fontes/osm.ts`
- Create: `src/lib/fontes/ritmo.ts`, `src/lib/fontes/ritmo.test.ts`
- Create: `src/lib/cacheBusca.ts`, `src/lib/cacheBusca.test.ts`
- Create: `src/app/useBusca.ts`
- Modify: `src/app/Garimpar.tsx` — **só** trocar o estado/lógica de busca pelo hook (sem redesign; a T5 redesenha)

**Interfaces:**
- Consumes: `lerRespostaJson` (T1), `SemAcesso`/`FonteErro` (T1).
- Produces: `criarRitmo(intervaloMs: number, agora?: () => number, dormir?: (ms) => Promise<void>): () => Promise<void>` — cada chamada espera só o que falta para `intervaloMs` desde o **início** da chamada anterior (a primeira não espera).
- Produces: `buscarOsm(nichoId, termo, cidade, categoria, opcoes?: { progresso?: Progresso; onParcial?: (empresas: Empresa[]) => void; sinal?: AbortSignal }): Promise<BuscaResposta>` — chama `onParcial` com a lista acumulada (cópia) após cada página; usa `criarRitmo(1100)`; a lista `excluir` é **compartilhada entre as consultas** do nicho (no máximo os últimos 150 ids); etiquetas genéricas filtradas por `manter` (`shop=hairdresser`, `shop=beauty` quando têm `manter`) usam no máx. **2** páginas; aborta se `sinal.aborted`. A chamada antiga com 5º argumento posicional deixa de existir — atualizar `src/lib/fontes/index.ts` se necessário.
- Produces: `lerCache(chave: string, agora: number): Empresa[] | null`, `gravarCache(chave: string, empresas: Empresa[], agora: number): void`, `chaveCache(nichoId: string, termo: string, cidade: string): string` (minúsculo, sem acento, trim) — `sessionStorage`, TTL **3 h**, ignora erros de storage.
- Produces: hook `useBusca()` retornando
  `{ busca, empresas, fonte, proxima, carregando: "busca" | "mais" | null, parcial: boolean, progresso, erro, setErro, buscar(alvo: { nichoId: string; termo: string; cidade: string; nicho: string }): Promise<void>, carregarMais(): Promise<void> }`
  — `buscar` cancela a busca anterior (AbortController + id incremental: parciais de busca velha são ignorados), seta `busca` **no início** (resultados aparecem ao vivo, `parcial = true` até terminar), usa cache se houver, grava cache ao terminar, salva cidade em `localStorage` (`garimpo:cidade`); no fallback `SemAcesso` vai pro servidor via `fetch("/api/buscar")` + `lerRespostaJson`. `setEmpresas` dos parciais dentro de `startTransition`.

- [ ] **Step 1: Testes que falham**

```ts
// ritmo.test.ts — relógio falso
let t = 0; const dormidas: number[] = [];
const ritmo = criarRitmo(1100, () => t, async (ms) => { dormidas.push(ms); t += ms; });
await ritmo(); t += 800; await ritmo(); t += 1500; await ritmo();
expect(dormidas).toEqual([300]); // 1ª não espera; 2ª espera 1100-800; 3ª já passou 1500
// cacheBusca.test.ts (stub de sessionStorage em memória)
expect(chaveCache("barbearia", "barbearia", " Lavras, MG ")).toBe(chaveCache("barbearia", "barbearia", "lavras, mg"));
gravarCache("k", [emp("a")], 0);
expect(lerCache("k", 3 * 3600_000 - 1)?.length).toBe(1);
expect(lerCache("k", 3 * 3600_000 + 1)).toBeNull();
expect(lerCache("inexistente", 0)).toBeNull();
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `ritmo.ts` e `cacheBusca.ts` → PASS.
- [ ] **Step 4:** Alterar `osm.ts` (opções, ritmo, `excluir` compartilhado, limite de páginas, `onParcial`, `sinal`).
- [ ] **Step 5:** Criar `useBusca.ts` e plugar em `Garimpar.tsx` mantendo o JSX atual; o spinner/linha de status usam `carregando === "busca"`; o botão "Carregar mais" usa `carregando === "mais"`; mostrar cards enquanto `parcial` com a linha de progresso visível acima da grade. Ao trocar a fonte para não-google, `ordem` volta para `"contato"` (bug 12).
- [ ] **Step 6:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` → OK. Teste manual no `npm run dev`: buscar "Barbearia" em "Lavras, MG" → primeiros cards aparecem antes do fim; repetir a busca → instantânea.
- [ ] **Step 7: Commit** — `perf: resultados ao vivo, ritmo de 1 req/s real, menos requisições e cache de busca`

---

### Task 4: Página de leads — bugs, redesign, CSV e retorno

**Files:**
- Create: `supabase/migrations/002_proximo_contato.sql`
- Modify: `src/lib/types.ts` (`Lead.proximo_contato: string | null`)
- Modify: `src/lib/leads.ts` (`atualizarLead` aceita `proximo_contato`; `lerLocal` normaliza `proximo_contato ?? null`; `idsSalvos` lança no `error`; listagem paginada além de 1000 com `.range`)
- Create: `src/lib/exportar.ts`, `src/lib/exportar.test.ts`
- Create: `src/lib/retorno.ts`, `src/lib/retorno.test.ts`
- Modify: `src/app/leads/Leads.tsx`
- Modify: `README.md` (passo do Supabase cita `002_proximo_contato.sql`)

**Interfaces:**
- Consumes: `montarMensagem` com `nicho` (T1); `SpotlightCard`, `Contador`, `TextoDecrypt`, `vidro`, `texto-cromado`, `Chip` (T2).
- Produces: `leadsParaCsv(leads: Lead[]): string`, `baixarCsv(nomeArquivo: string, csv: string): void`.
- Produces: `type SituacaoRetorno = "atrasado" | "hoje" | "futuro"`; `situacaoRetorno(data: string | null | undefined, agora: Date): SituacaoRetorno | null` (compara `YYYY-MM-DD` **local**); `ordenarPorRetorno(leads: Lead[], agora: Date): Lead[]` (atrasados do mais antigo, hoje, futuros do mais próximo, sem data na ordem original).
- Produces: `atualizarLead(id, campos: Partial<Pick<Lead, "status" | "observacao" | "proximo_contato">>)`.

- [ ] **Step 1:** Migração: `alter table public.leads add column if not exists proximo_contato date;` + `create index if not exists leads_user_retorno_idx on public.leads (user_id, proximo_contato);`
- [ ] **Step 2: Testes que falham**

```ts
// exportar.test.ts
const csv = leadsParaCsv([lead({ nome: 'Bar "do Zé"', observacao: "ligar; depois\nàs 10h", telefone: "35998765432", status: "contatado" })]);
const semBom = csv.replace(/^﻿/, "");
expect(csv.startsWith("﻿")).toBe(true);
expect(semBom.split("\r\n")[0]).toBe("Nome;Nicho;Cidade;Telefone;Presença;Status;Retornar em;Endereço;Site;Google Maps;Anotações;Salvo em");
expect(semBom).toContain('"Bar ""do Zé"""'); expect(semBom).toContain('"ligar; depois\nàs 10h"');
expect(semBom).toContain("(35) 99876-5432"); expect(semBom).toContain("Contatado");
// retorno.test.ts
const agora = new Date(2026, 9, 11, 23, 30);
expect(situacaoRetorno(null, agora)).toBeNull(); expect(situacaoRetorno(undefined, agora)).toBeNull();
expect(situacaoRetorno("2026-10-10", agora)).toBe("atrasado");
expect(situacaoRetorno("2026-10-11", agora)).toBe("hoje");
expect(situacaoRetorno("2026-10-12", agora)).toBe("futuro");
expect(ordenarPorRetorno([l("a", null), l("b", "2026-10-20"), l("c", "2026-10-01"), l("d", "2026-10-11")], agora).map((x) => x.id)).toEqual(["c", "d", "b", "a"]);
```

- [ ] **Step 3:** `npm test` → FAIL. **Step 4:** Implementar `exportar.ts`, `retorno.ts`, tipos e `leads.ts` → PASS.
- [ ] **Step 5: `Leads.tsx` — bugs**
  - `mudar`/`remover`: no erro desfazer **só o item afetado** (guardar o lead original; remoção reinsere na posição original).
  - Anotação: salva no `onBlur` **e** com debounce de 800 ms enquanto digita; `useEffect` sincroniza `obs` quando `l.observacao` mudar de fora.
  - Confirmação de exclusão: sem `onBlur`; volta ao normal após 4 s ou clique em "Cancelar" (funciona no Safari/iOS).
  - `modelo` lido em `useEffect` (não no inicializador do `useState`).
- [ ] **Step 6: `Leads.tsx` — redesign e recursos**
  - Título com `TextoDecrypt` ("Meus leads") e `texto-cromado`; funil em 5 cards `SpotlightCard` com `Contador`; no celular o funil vira uma faixa rolável horizontal (`no-scrollbar`, `snap-x`).
  - Chip "Retornar hoje · N" (atrasados + hoje) que filtra só esses; a lista visível passa por `ordenarPorRetorno`.
  - Cada lead: `SpotlightCard as="li"` com `vidro`; `<input type="date">` "Retornar em" (salva `proximo_contato` ou `null`); badge "Atrasado" (vermelho) / "Retornar hoje" (amber).
  - Botão "Exportar CSV" (ícone `Download`) exporta os `visiveis`, arquivo `garimpo-leads-AAAA-MM-DD.csv`, desabilitado com lista vazia.
  - WhatsApp passa `nicho: l.nicho` no `montarMensagem`.
  - Layout: 1 coluna < 1024 px, 2 colunas ≥ 1024 px; ações do card com alvos ≥ 44 px.
- [ ] **Step 7:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` → OK.
- [ ] **Step 8: Commit** — `feat: leads com data de retorno, exportar CSV, visual futurista e correções de desfazer`

---

### Task 5: Página de busca redesenhada + card de empresa

**Files:**
- Modify: `src/app/Garimpar.tsx` (JSX/visual; lógica já está no `useBusca`)
- Modify: `src/components/EmpresaCard.tsx`
- Create: `src/lib/filtros.ts`, `src/lib/filtros.test.ts`
- Modify: `src/lib/nichos.ts` (nada de API; só se precisar de ordem/ícones)
- Modify: `src/components/Marquee.tsx` (visual)

**Interfaces:**
- Consumes: `useBusca` (T3); `AuroraFundo`, `TextoDecrypt`, `PastilhaCromada`, `SpotlightCard`, `Contador`, `BotaoLuz`, `Chip`, utilitários (T2); `linkBuscaInstagram`, `montarMensagem` com `nicho` (T1); `idsSalvos`, `salvarLead` (`leads.ts`).
- Produces: `semSalvos(empresas: Empresa[], salvos: Set<string>): Empresa[]`; `pesoContato(e: Empresa): number` (celular 2, fixo 1, nenhum 0) exportado de `filtros.ts` e pré-calculado uma vez por empresa antes do sort.
- Produces: `EmpresaCard` com `memo`, props `{ empresa; cidade; nicho; modelo; salvo; onSalvar: (e: Empresa) => void; indice }` (callback estável recebe a empresa).

- [ ] **Step 1: Testes que falham**

```ts
expect(semSalvos([emp("a"), emp("b")], new Set(["a"])).map((e) => e.placeId)).toEqual(["b"]);
expect(pesoContato(emp("a", { telefone: "(35) 99876-5432" }))).toBe(2);
expect(pesoContato(emp("a", { telefone: "(35) 3821-6855" }))).toBe(1);
expect(pesoContato(emp("a", { telefone: null }))).toBe(0);
```
- [ ] **Step 2:** FAIL → **Step 3:** implementar → PASS.
- [ ] **Step 4: Hero (coreografia única)**
  - `AuroraFundo` atrás do hero + `grade-fundo`; selo "OpenStreetMap · grátis · uso próprio" em `vidro`.
  - Título gigante em `font-display` (Space Grotesk, `text-[clamp(2.75rem,9vw,7rem)]`, `tracking-tighter`, `leading-[0.95]`): "Ache quem ainda" + linha 2 em `font-serif italic text-lime` com `TextoDecrypt` "não tem site.".
  - Sequência de entrada uma vez: aurora acende (fade 600 ms) → título decodifica → formulário sobe (`animate-rise` com atraso 300 ms). Nada mais em loop no hero.
- [ ] **Step 5: Formulário**
  - Nichos como chips com `PastilhaCromada` `sm`; no celular, rolagem horizontal com `snap-x` e gradiente de fade nas bordas; ≥ 768 px quebram linha.
  - Campo de cidade e `BotaoLuz` "Garimpar": empilhados < 640 px (botão largura total), lado a lado acima. Fundo do form `bg-panel` sólido (sem blur).
- [ ] **Step 6: Resultados**
  - Números em 4 `SpotlightCard` com `Contador` (2×2 no celular, 4 colunas ≥ 640 px).
  - Barra de filtros: chips + chip novo "Esconder salvos" (`BookmarkCheck`, padrão **ligado**, aplica `semSalvos`); a barra fica `sticky` abaixo da navbar no desktop.
  - Enquanto `parcial`: linha de progresso fina animada no topo da grade + texto do `progresso`.
  - Grade: 1 / 2 (≥ 640) / 3 (≥ 1024) colunas.
  - Editor de mensagem: rótulo `Modelo · use {nome}, {cidade} e {nicho}`; prévia com `nicho: busca.nicho`; no celular as duas colunas empilham.
  - Estado vazio: 3 passos em `SpotlightCard` com `PastilhaCromada`.
- [ ] **Step 7: `EmpresaCard`**
  - `memo`; envolto em `SpotlightCard as="article"`; `[content-visibility:auto] [contain-intrinsic-size:auto_320px]`; `animate-rise` **só** se `indice < 12`.
  - Link do WhatsApp montado com `useMemo` (deps: telefone, modelo, nome, cidade, nicho).
  - Botão "Procurar Instagram" (ícone `AtSign`, abre `linkBuscaInstagram`) quando `presenca === "sem_site"`.
  - "Sem telefone no Google" → "Sem telefone cadastrado".
  - Botões de ação com 44 px.
- [ ] **Step 8:** `Marquee` com texto `texto-cromado` sobre faixa escura com borda lime fina (em vez do bloco verde chapado).
- [ ] **Step 9:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` → OK.
- [ ] **Step 10: Commit** — `feat: página de busca futurista, cards rápidos, esconder salvos e atalho do Instagram`

---

### Task 6: Navegação, layout, login e autenticação

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/app/login/page.tsx`, `src/app/login/LoginForm.tsx`
- Modify: `src/lib/supabase/server.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `AuroraFundo`, `PastilhaCromada`, `BotaoLuz`, `TextoDecrypt`, `vidro`, `texto-cromado` (T2).
- Produces: `usuarioAtual` envolvido em `cache` do React (mesma assinatura).

- [ ] **Step 1: `next.config.ts`** — `Referrer-Policy` → `strict-origin-when-cross-origin` (o Nominatim precisa do Referer de origem pra identificar o app; antes era `same-origin` e o navegador não mandava nada).
- [ ] **Step 2: `server.ts`** — `export const usuarioAtual = cache(async () => { … })` (importar `cache` de `react`); manter `getUser()` (segurança) mas uma vez por requisição.
- [ ] **Step 3: Navbar**
  - Desktop (≥ 768): pílula flutuante `vidro` no topo, logo com `PastilhaCromada` + "Garimpo" `font-display`; links com indicador ativo de luz lime embaixo.
  - Celular (< 768): topo só com o logo (sem blur: `bg-panel/95`); **dock flutuante fixo embaixo** (`fixed bottom-4 inset-x-4`, `vidro`, `pb-[env(safe-area-inset-bottom)]`) com 3 itens ≥ 44 px: Garimpar (`Pickaxe`), Leads (`Bookmark`), Sair (`LogOut`, só com Supabase). Remover o menu de meia tela e o overlay (resolve o bug do menu que não fechava). Para o dock não cobrir o fim da página, adicionar `pb-28 md:pb-0` no `<body>` em `src/app/layout.tsx` (única linha da T6 nesse arquivo; não conflita com a T2, que já terá sido mergeada).
  - `supabase-js` fora do bundle inicial: decidir "mostrar Sair" por `supabaseLigado` de `config.ts`; no clique, `const { getSupabase } = await import("@/lib/supabase/client")`.
- [ ] **Step 4: Login**
  - Lado da marca com `AuroraFundo` e título `TextoDecrypt` + `texto-cromado`; formulário em `vidro`; botão `BotaoLuz`.
  - Celular: o lado da marca vira um cabeçalho compacto (logo + 1 linha) acima do formulário em vez de sumir.
  - Bug: `<LoginForm key={erro ?? "ok"} …>` e, no `LoginForm`, `useEffect` que zera `carregando` e mostra o erro quando `semAcesso` mudar.
- [ ] **Step 5:** `npm run lint`, `npx tsc --noEmit`, `npm run build` → OK. Manual: em 375 px, o dock aparece e navega; em 1440 px, pílula no topo.
- [ ] **Step 6: Commit** — `feat: navegação com dock no celular, login futurista e auth mais rápida; corrige Referer do mapa`

---

## QA final (coordenador, após a Onda 3)

- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Navegador em 360, 768, 1024, 1440 px: `/`, `/leads`, `/login` — sem rolagem horizontal, nada cortado, dock não cobre conteúdo.
- Fazer uma busca real (Barbearia, Lavras, MG): cards aparecem ao vivo; repetir é instantâneo.
- Emular `prefers-reduced-motion` e largura 390 px: sem WebGL, sem animação, tudo usável.
- Revisão final da branch inteira (subagent-driven-development).

## Fora do escopo (decisão do Claude)

- Vídeo/3D renderizado próprio no hero (exigiria assets que não temos); a aurora WebGL cumpre o papel.
- Trocar a fonte de dados, Kanban arrastável, envio automático de WhatsApp.
- Rodar a migração `002` no Supabase de produção (passo manual, documentado no README).
- Deploy na Vercel.
