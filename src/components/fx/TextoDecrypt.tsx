"use client";

import { useEffect, useRef, useState } from "react";
import { useReduzMovimento } from "./movimento";

const SIMBOLOS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?/<>";
const DURACAO_MS = 700;

function embaralhar(texto: string, revelados: number) {
  let saida = "";
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    // espaço continua espaço, pra não mudar a quebra de linha
    if (i < revelados || c.trim() === "") saida += c;
    else saida += SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
  }
  return saida;
}

/**
 * Texto que chega "decifrando": embaralha e revela da esquerda pra direita
 * em ~700 ms, uma única vez ao montar. Com "reduzir movimento", mostra direto.
 */
export function TextoDecrypt({
  texto,
  className = "",
  atrasoMs = 0,
}: {
  texto: string;
  className?: string;
  atrasoMs?: number;
}) {
  const reduz = useReduzMovimento();
  const [exibido, setExibido] = useState<string | null>(null);
  const jaAnimou = useRef(false);

  useEffect(() => {
    if (reduz || jaAnimou.current) return;
    jaAnimou.current = true;

    const inicio = performance.now() + atrasoMs;
    let quadro = 0;
    let terminou = false;
    const passo = (agora: number) => {
      const progresso = (agora - inicio) / DURACAO_MS;
      if (progresso >= 1) {
        terminou = true;
        setExibido(null);
        return;
      }
      setExibido(embaralhar(texto, Math.max(0, Math.floor(progresso * texto.length))));
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);

    return () => {
      cancelAnimationFrame(quadro);
      // interrompida no meio (ex.: StrictMode remonta): pode tentar de novo
      if (!terminou) jaAnimou.current = false;
      setExibido(null);
    };
  }, [reduz, texto, atrasoMs]);

  return (
    <span aria-label={texto} className={className}>
      <span aria-hidden>{exibido ?? texto}</span>
    </span>
  );
}
