// Quem pode entrar. Mesmo que alguém consiga criar uma conta no Supabase
// (cadastro deveria estar desligado), sem estar nesta lista não passa do login.
const PADRAO = "ragi@admin.com";

export function emailsPermitidos() {
  return (process.env.EMAILS_PERMITIDOS || PADRAO)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function emailPermitido(email: string | null | undefined) {
  return Boolean(email) && emailsPermitidos().includes(email!.toLowerCase());
}

// Para onde voltar depois do login. Só aceita caminho interno: nada de
// "//site.com" ou "https://..." (redirecionamento aberto pra phishing).
export function destinoSeguro(valor: unknown) {
  if (typeof valor !== "string") return "/";
  // o navegador ignora tab/quebra de linha e trata "\" como "/": "/\t/site.com" vira "//site.com"
  if (/[\u0000-\u001f\u007f\\]/.test(valor)) return "/";
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/";
  if (valor.startsWith("/login") || valor.startsWith("/api")) return "/";
  return valor.slice(0, 200);
}
