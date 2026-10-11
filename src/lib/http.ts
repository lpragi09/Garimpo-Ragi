// Lê a resposta como texto e só então tenta interpretar como JSON — algumas fontes
// respondem erro em HTML/texto puro, e `res.json()` direto quebraria com uma mensagem confusa.
function mensagemPorStatus(status: number): string {
  if (status === 504 || status === 408) return "A busca demorou demais. Tente de novo em 1 minuto.";
  if (status === 429 || status === 503) return "O mapa limitou as consultas. Tente de novo em 1 minuto.";
  return "Erro ao buscar.";
}

export async function lerRespostaJson<T>(res: Response): Promise<T> {
  const texto = await res.text();
  let data: unknown;
  let falhouParse = false;
  try {
    data = texto ? JSON.parse(texto) : undefined;
  } catch {
    falhouParse = true;
  }
  if (falhouParse || !res.ok) {
    const erro = !falhouParse && data && typeof data === "object" ? (data as { erro?: string }).erro : undefined;
    throw new Error(erro || mensagemPorStatus(res.status));
  }
  return data as T;
}
