# Garimpo

Ferramenta pessoal pra achar negócios sem site e oferecer landing page / site.

- Busca por nicho + cidade (qualquer cidade do Brasil) no **OpenStreetMap** — grátis, sem chave e sem cartão
- Separa quem está **sem site**, **só com rede social** (Instagram, iFood, Linktree…) e quem já tem site
- Botão de WhatsApp com mensagem pronta (editável) quando o número é celular
- Botão pra conferir o negócio no Google Maps antes de chamar
- Lista de leads com status (novo → contatado → negociando → fechado/perdido) e anotações

Next.js 16 · Tailwind 4 · Supabase · lucide-react · Vercel Analytics/Speed Insights

## Rodando

```bash
cp .env.example .env.local
npm install
npm run dev
```

Sem Supabase os leads ficam no localStorage (só em desenvolvimento — em produção o app não abre sem Supabase).

## De onde vêm os dados

O padrão é o OpenStreetMap: o Nominatim acha a cidade e o Overpass lista os estabelecimentos
(`src/lib/fontes/osm.ts`). Cidades grandes têm bem mais dados que as pequenas, e "sem site" no OSM
às vezes é só falta de cadastro — por isso cada card tem o link pro Google Maps.

Os servidores públicos do Overpass às vezes ficam lotados; a busca tenta três servidores, duas vezes.

### Google (opcional)

Também dá pra usar a Places API (New) do Google, que traz nota, avaliações e site com mais precisão,
mas precisa de faturamento ativo no Google Cloud:

1. Ativar **Places API (New)** e criar uma chave restrita a ela (restrição de aplicativo: Nenhum)
2. `GOOGLE_PLACES_API_KEY=...` e `FONTE_DADOS=google`
3. Colocar uma cota diária em Places API (New) → Cotas pra não sair do gratuito

## Supabase

1. Rodar `supabase/migrations/001_leads.sql` no SQL Editor
2. Authentication → Sign In / Providers → desligar "Allow new users to sign up"
3. Authentication → Users → Add user (seu e-mail e senha)
4. Preencher `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `EMAILS_PERMITIDOS`

Tudo fica atrás do login (`src/proxy.ts` + checagem em cada página), só os e-mails de
`EMAILS_PERMITIDOS` entram, e a tabela `leads` tem RLS: cada usuário só vê os próprios.
