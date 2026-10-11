// Lê a resposta como texto e só então tenta interpretar como JSON — algumas fontes
// respondem erro em HTML/texto puro, e `res.json()` direto quebraria com uma mensagem confusa.
function mensagemPorStatus(status: number): string {
  if (status === 504 || status === 408) return "A busca demorou demais. Tente de novo em 1 minuto.";
  if (status === 429 || status === 503) return "O mapa limitou as consultas. Tente de novo em 1 minuto.";
  return "Erro ao buscar.";
}

// Junta vários sinais num só: aborta quando qualquer um abortar, levando o motivo dele.
// Usa AbortSignal.any quando existe; navegadores antigos (Safari < 17.4, Chrome < 116,
// Firefox < 124) não têm, então liga os eventos num AbortController novo.
export function combinarSinais(...sinais: (AbortSignal | undefined)[]): AbortSignal {
  const validos = sinais.filter((s): s is AbortSignal => Boolean(s));
  if (validos.length === 1) return validos[0];
  if (typeof AbortSignal.any === "function") return AbortSignal.any(validos);

  const ctrl = new AbortController();
  const jaAbortado = validos.find((s) => s.aborted);
  if (jaAbortado) {
    ctrl.abort(jaAbortado.reason);
    return ctrl.signal;
  }
  const soltar = () => validos.forEach((s) => s.removeEventListener("abort", aoAbortar));
  function aoAbortar(this: AbortSignal) {
    soltar();
    ctrl.abort(this.reason);
  }
  validos.forEach((s) => s.addEventListener("abort", aoAbortar));
  return ctrl.signal;
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
