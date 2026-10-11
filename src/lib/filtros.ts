import { ehCelular } from "./contato";
import type { Empresa } from "./types";

// Esconde da lista quem já foi salvo nos leads.
export function semSalvos(empresas: Empresa[], salvos: Set<string>): Empresa[] {
  if (salvos.size === 0) return empresas;
  return empresas.filter((e) => !salvos.has(e.placeId));
}

// Quanto vale o contato pra ordenar: celular (dá WhatsApp) 2 > fixo 1 > sem telefone 0.
export function pesoContato(e: Empresa): number {
  if (!e.telefone) return 0;
  return ehCelular(e.telefone) ? 2 : 1;
}

// Fatia da lista pra página pedida (1 = primeira). Página fora do intervalo vai pra mais próxima
// (ex.: um filtro diminuiu a lista e a página atual deixou de existir).
export function paginar<T>(lista: T[], pagina: number, porPagina: number) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  return { itens: lista.slice((atual - 1) * porPagina, atual * porPagina), pagina: atual, totalPaginas };
}
