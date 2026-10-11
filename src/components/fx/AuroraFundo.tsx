"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useSyncExternalStore } from "react";
import { CONSULTA_REDUZ_MOVIMENTO, podeAnimarPesado } from "./movimento";

// Fallback estático: o mesmo clima da aurora, só que em CSS puro.
function GradienteEstatico() {
  return (
    <div
      className="h-full w-full"
      style={{
        background: [
          "radial-gradient(55% 45% at 20% 10%, rgb(10 228 72 / 0.16), transparent 70%)",
          "radial-gradient(45% 40% at 55% 0%, rgb(157 149 255 / 0.14), transparent 70%)",
          "radial-gradient(45% 45% at 88% 15%, rgb(0 186 226 / 0.12), transparent 70%)",
        ].join(", "),
      }}
    />
  );
}

// O ogl só baixa quando a aurora vai mesmo rodar.
const Aurora = dynamic(() => import("./Aurora"), {
  ssr: false,
  loading: () => <GradienteEstatico />,
});

function assinar(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA_REDUZ_MOVIMENTO);
  mq.addEventListener("change", avisar);
  window.addEventListener("resize", avisar);
  return () => {
    mq.removeEventListener("change", avisar);
    window.removeEventListener("resize", avisar);
  };
}

const lerNoNavegador = () =>
  podeAnimarPesado({
    largura: window.innerWidth,
    nucleos: navigator.hardwareConcurrency,
    reduzMovimento: window.matchMedia(CONSULTA_REDUZ_MOVIMENTO).matches,
  });
// No servidor nunca anima: o HTML sai com o gradiente estático.
const lerNoServidor = () => false;

/**
 * Fundo de aurora que preenche o pai (o pai precisa de `relative` e,
 * por causa do `-z-10`, de `isolate` pra criar o próprio contexto).
 * WebGL só em tela ≥ 768px, com mais de 4 núcleos e sem "reduzir movimento";
 * no resto, gradiente CSS parado.
 */
export function AuroraFundo({ className = "absolute inset-0 -z-10" }: { className?: string }) {
  const animar = useSyncExternalStore(assinar, lerNoNavegador, lerNoServidor);
  // WebGL falhou ao iniciar ou perdeu o contexto: fica no gradiente de vez
  const [falhou, setFalhou] = useState(false);
  const aoFalhar = useCallback(() => setFalhou(true), []);

  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      {animar && !falhou ? <Aurora onFalha={aoFalhar} /> : <GradienteEstatico />}
    </div>
  );
}
