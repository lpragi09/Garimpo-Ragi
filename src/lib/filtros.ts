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
