"use client";

import { useEffect, useRef, useState } from "react";
import { useReduzMovimento } from "./movimento";

const DURACAO_MS = 600;
const formato = new Intl.NumberFormat("pt-BR");

/**
 * Número que corre do valor anterior até o novo em 600 ms.
 * Com "reduzir movimento", troca direto.
 */
export function Contador({ valor, className = "" }: { valor: number; className?: string }) {
  const reduz = useReduzMovimento();
  const [exibido, setExibido] = useState(valor);
  // o número que está na tela agora (ponto de partida da próxima animação)
  const atual = useRef(valor);

  useEffect(() => {
    if (reduz) {
      atual.current = valor;
      return;
    }
    // mesmo com de === valor roda um quadro, pra alinhar o estado
    // caso o valor tenha mudado enquanto estava em "reduzir movimento"
    const de = atual.current;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / DURACAO_MS);
      const suave = 1 - Math.pow(1 - p, 3); // desacelera no fim
      const n = de + (valor - de) * suave;
      atual.current = n;
      setExibido(n);
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, reduz]);

  const mostrar = reduz ? valor : exibido;
  return (
    <span className={`tabular-nums ${className}`}>
      {formato.format(Math.round(mostrar))}
    </span>
  );
}
