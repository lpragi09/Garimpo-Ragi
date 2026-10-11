import type { Lead } from "./types";

export type SituacaoRetorno = "atrasado" | "hoje" | "futuro";

function hojeLocalISO(agora: Date) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Compara "AAAA-MM-DD" (data de retorno, sem hora) com o dia local de `agora`.
export function situacaoRetorno(data: string | null | undefined, agora: Date): SituacaoRetorno | null {
  if (!data) return null;
  const hoje = hojeLocalISO(agora);
  if (data < hoje) return "atrasado";
  if (data > hoje) return "futuro";
  return "hoje";
}

// Atrasados (mais antigo primeiro), depois hoje, depois futuros (mais próximo primeiro);
// leads sem data de retorno ficam por último, na ordem em que vieram.
export function ordenarPorRetorno(leads: Lead[], agora: Date): Lead[] {
  const comSituacao = leads.map((l) => ({ l, sit: situacaoRetorno(l.proximo_contato, agora) }));

  const porData = (a: { l: Lead }, b: { l: Lead }) =>
    (a.l.proximo_contato ?? "") < (b.l.proximo_contato ?? "") ? -1 : 1;

  const atrasados = comSituacao.filter((x) => x.sit === "atrasado").sort(porData);
  const hoje = comSituacao.filter((x) => x.sit === "hoje");
  const futuros = comSituacao.filter((x) => x.sit === "futuro").sort(porData);
  const semData = comSituacao.filter((x) => x.sit === null);

  return [...atrasados, ...hoje, ...futuros, ...semData].map((x) => x.l);
}
