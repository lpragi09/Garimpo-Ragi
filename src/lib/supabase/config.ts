export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Sem Supabase configurado o app roda "aberto" — só aceito isso em desenvolvimento.
export const supabaseLigado = Boolean(SUPABASE_URL && SUPABASE_KEY);
