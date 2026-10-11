import type { Empresa, Fonte } from "@/lib/types";

export type AlvoBusca = { nichoId: string; termo: string; cidade: string; nicho: string };

// O que fica na tela depois de uma busca: o alvo e o que ela trouxe.
export type Resultado = { busca: AlvoBusca | null; empresas: Empresa[]; fonte: Fonte; proxima: string | null };

const INICIAL: Resultado = { busca: null, empresas: [], fonte: "osm", proxima: null };

// Busca falhou (cidade não achada, mapa fora do ar…). Se nada chegou dela, volta ao último
// resultado concluído — ou ao estado inicial — em vez de mostrar "0 encontrados" que
// contradiz o erro. Se já chegaram parciais, mantém o que chegou.
export function estadoAposFalha(ultimoConcluido: Resultado | null, alvo: AlvoBusca, parciais: Empresa[]): Resultado {
  if (parciais.length === 0) return ultimoConcluido ?? INICIAL;
  return { busca: alvo, empresas: parciais, fonte: "osm", proxima: null };
}

// "Nenhum resultado" só faz sentido com a busca terminada e sem erro.
export function mostrarVazio({ parcial, erro }: { parcial: boolean; erro: string | null }): boolean {
  return !parcial && !erro;
}
