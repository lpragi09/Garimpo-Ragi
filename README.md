# Garimpo

Ferramenta pessoal pra achar negócios sem site no Google Maps e oferecer landing page / site.

- Busca por nicho + cidade usando a Places API (New) do Google
- Separa quem está **sem site**, **só com rede social** (Instagram, iFood, Linktree…) e quem já tem site
- Marca como "quente" quem não tem site mas tem movimento (30+ avaliações e nota 4,2+)
- Botão de WhatsApp com mensagem pronta (editável) quando o número é celular
- Lista de leads com status (novo → contatado → negociando → fechado/perdido) e anotações

Next.js 16 · Tailwind 4 · Supabase · lucide-react · Vercel Analytics/Speed Insights

## Rodando

```bash
cp .env.example .env.local
npm install
npm run dev
```

Sem `GOOGLE_PLACES_API_KEY` a busca devolve dados fictícios. Sem Supabase os leads ficam no
localStorage (só em desenvolvimento — em produção o app não abre sem Supabase).

## Google

1. console.cloud.google.com → criar projeto → ativar **Places API (New)** (precisa de faturamento ativo)
2. Credenciais → criar chave de API → restringir à Places API (New)
3. Colocar em `GOOGLE_PLACES_API_KEY`. A chave só é usada no servidor (`/api/buscar`).

Cada página de 20 resultados é uma chamada de Text Search no SKU Enterprise (por causa do
`websiteUri` e do telefone). Vale criar um alerta de orçamento no Google Cloud.

## Supabase

1. Rodar `supabase/migrations/001_leads.sql` no SQL Editor
2. Authentication → Sign In / Providers → desligar "Allow new users to sign up"
3. Authentication → Users → Add user (seu e-mail e senha)
4. Preencher `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Tudo fica atrás do login (`src/proxy.ts`) e a tabela `leads` tem RLS: cada usuário só vê os próprios.
