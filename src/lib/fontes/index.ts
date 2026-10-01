import "server-only";
import type { BuscaResposta } from "../types";
import { buscarGoogle } from "./google";
import { buscarOsm } from "./osm";

export { FonteErro } from "./erro";

type Pedido = { nichoId: string; termo: string; categoria: string; cidade: string; pagina?: string };

// OpenStreetMap é o padrão (grátis). O Google só entra se for ligado de propósito.
export function buscarEmpresas(p: Pedido): Promise<BuscaResposta> {
  const chave = process.env.GOOGLE_PLACES_API_KEY;
  if (process.env.FONTE_DADOS === "google" && chave) {
    return buscarGoogle(chave, p.termo, p.cidade, p.pagina);
  }
  return buscarOsm(p.nichoId, p.termo, p.cidade, p.categoria);
}
