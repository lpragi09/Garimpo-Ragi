// Telefones do Google chegam como "(35) 99876-5432" ou "+55 35 99876-5432".
export function soDigitos(telefone: string) {
  let d = telefone.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

// Celular no Brasil: DDD + 9 dígitos começando com 9. Fixo quase nunca tem WhatsApp.
export function ehCelular(telefone: string) {
  const d = soDigitos(telefone);
  return d.length === 11 && d[2] === "9";
}

export const MENSAGEM_PADRAO =
  "Oi, tudo bem? Encontrei a {nome} no Google Maps e vi que vocês ainda não têm um site próprio. " +
  "Eu crio sites e landing pages para negócios de {cidade}, com WhatsApp direto e aparecendo melhor no Google. " +
  "Posso te mandar um exemplo de como ficaria o da {nome}?";

export function montarMensagem(modelo: string, dados: { nome: string; cidade?: string | null }) {
  return modelo
    .replaceAll("{nome}", dados.nome)
    .replaceAll("{cidade}", dados.cidade?.trim() || "sua cidade");
}

export function linkWhatsApp(telefone: string, mensagem: string) {
  return `https://wa.me/55${soDigitos(telefone)}?text=${encodeURIComponent(mensagem)}`;
}

const STORAGE_KEY = "garimpo:mensagem";

export function lerModelo() {
  try {
    return localStorage.getItem(STORAGE_KEY) || MENSAGEM_PADRAO;
  } catch {
    return MENSAGEM_PADRAO;
  }
}

export function salvarModelo(texto: string) {
  try {
    localStorage.setItem(STORAGE_KEY, texto);
  } catch {}
}
