import type { Empresa } from "./types";

// Cache das buscas no sessionStorage: repetir a mesma busca (voltar de outra página,
// trocar o filtro e refazer) é instantâneo e não gasta consultas do Nominatim.
const PREFIXO = "garimpo:busca:";
const VALIDADE_MS = 3 * 3600_000; // 3 h

type Guardado = { em: number; empresas: Empresa[] };

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

export function chaveCache(nichoId: string, termo: string, cidade: string): string {
  return [nichoId, termo, cidade].map(normalizar).join("|");
}

export function lerCache(chave: string, agora: number): Empresa[] | null {
  try {
    const bruto = sessionStorage.getItem(PREFIXO + chave);
    if (!bruto) return null;
    const g = JSON.parse(bruto) as Guardado;
    if (typeof g?.em !== "number" || !Array.isArray(g.empresas)) return null;
    if (agora - g.em > VALIDADE_MS) {
      sessionStorage.removeItem(PREFIXO + chave);
      return null;
    }
    return g.empresas;
  } catch {
    // storage bloqueado, ausente ou conteúdo corrompido: segue sem cache
    return null;
  }
}

export function gravarCache(chave: string, empresas: Empresa[], agora: number): void {
  try {
    const g: Guardado = { em: agora, empresas };
    sessionStorage.setItem(PREFIXO + chave, JSON.stringify(g));
  } catch {
    // cheio ou bloqueado: o cache é só um atalho, tudo bem não gravar
  }
}
