// Lembra a busca da aba (o que foi buscado, filtros e página) pra ela voltar depois do F5.
// Fica no sessionStorage, igual ao cache dos resultados: fechou a aba, esquece.
const CHAVE = "garimpo:sessao";

export const FILTROS_RESULTADO = ["oportunidades", "sem_site", "rede_social", "todos"] as const;
export type FiltroResultado = (typeof FILTROS_RESULTADO)[number];
export const ORDENS = ["contato", "nome", "avaliacoes", "nota"] as const;
export type Ordem = (typeof ORDENS)[number];

export type SessaoBusca = {
  alvo: { nichoId: string; termo: string; cidade: string; nicho: string };
  filtro: FiltroResultado;
  ordem: Ordem;
  soTelefone: boolean;
  esconderSalvos: boolean;
  nichoFiltro: string;
  pagina: number;
};

export function salvarSessao(s: SessaoBusca) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(s));
  } catch {}
}

const texto = (v: unknown) => (typeof v === "string" ? v : "");
const umDe = <T extends string>(v: unknown, opcoes: readonly T[], padrao: T): T =>
  opcoes.includes(v as T) ? (v as T) : padrao;

// Sem busca válida (sem termo ou cidade), não restaura nada; o resto cai no padrão se vier estranho.
export function lerSessao(): SessaoBusca | null {
  let bruto: Record<string, unknown>;
  try {
    bruto = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null");
  } catch {
    return null;
  }
  if (!bruto || typeof bruto !== "object") return null;
  const a = (bruto.alvo ?? {}) as Record<string, unknown>;
  const alvo = { nichoId: texto(a.nichoId), termo: texto(a.termo), cidade: texto(a.cidade), nicho: texto(a.nicho) };
  if (!alvo.termo || !alvo.cidade) return null;
  const pagina = Number(bruto.pagina);
  return {
    alvo,
    filtro: umDe(bruto.filtro, FILTROS_RESULTADO, "oportunidades"),
    ordem: umDe(bruto.ordem, ORDENS, "contato"),
    soTelefone: bruto.soTelefone === true,
    esconderSalvos: bruto.esconderSalvos !== false,
    nichoFiltro: texto(bruto.nichoFiltro),
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}
