import { useSyncExternalStore } from "react";

export const CONSULTA_REDUZ_MOVIMENTO = "(prefers-reduced-motion: reduce)";

/**
 * Decide se dá pra rodar efeito pesado (WebGL): nada no celular,
 * nada em aparelho fraco e nada se a pessoa pediu menos movimento.
 */
export function podeAnimarPesado(info: {
  largura: number;
  nucleos?: number;
  reduzMovimento: boolean;
}): boolean {
  if (info.reduzMovimento) return false;
  if (info.largura < 768) return false;
  if (info.nucleos !== undefined && info.nucleos <= 4) return false;
  return true;
}

function assinar(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA_REDUZ_MOVIMENTO);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}

const lerNoNavegador = () => window.matchMedia(CONSULTA_REDUZ_MOVIMENTO).matches;
// No servidor (e na hidratação) assume o caminho seguro: sem movimento.
const lerNoServidor = () => true;

/**
 * `true` quando o sistema pede menos movimento. No servidor e no primeiro
 * render da hidratação devolve `true`; depois lê o `matchMedia` e acompanha
 * as mudanças.
 */
export function useReduzMovimento(): boolean {
  return useSyncExternalStore(assinar, lerNoNavegador, lerNoServidor);
}
