"use client";

import { startTransition, useRef, useState } from "react";
import { SemAcesso, buscarOsm } from "@/lib/fontes/osm";
import { chaveCache, gravarCache, lerCache } from "@/lib/cacheBusca";
import { lerRespostaJson } from "@/lib/http";
import type { BuscaResposta, Empresa, Fonte } from "@/lib/types";

export type AlvoBusca = { nichoId: string; termo: string; cidade: string; nicho: string };

const CIDADE_KEY = "garimpo:cidade";

// Google só se for ligado de propósito; o padrão é o OpenStreetMap, consultado daqui do navegador.
const USA_GOOGLE = process.env.NEXT_PUBLIC_FONTE_DADOS === "google";

async function buscarNoServidor(alvo: AlvoBusca, sinal: AbortSignal, pagina?: string): Promise<BuscaResposta> {
  const res = await fetch("/api/buscar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nicho: alvo.nichoId, termo: alvo.termo, categoria: alvo.nicho, cidade: alvo.cidade, pagina }),
    signal: AbortSignal.any([sinal, AbortSignal.timeout(90_000)]),
  });
  return lerRespostaJson<BuscaResposta>(res);
}

function mensagemDeErro(e: unknown): string {
  if (e instanceof DOMException && e.name === "TimeoutError") return "A busca demorou demais. Tente de novo em 1 minuto.";
  return e instanceof Error ? e.message : "Erro ao buscar.";
}

// Estado e lógica da busca: resultados ao vivo (página a página), cancelamento da busca
// anterior, cache da sessão e reserva pelo servidor quando o navegador é bloqueado.
export function useBusca() {
  const [busca, setBusca] = useState<AlvoBusca | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [fonte, setFonte] = useState<Fonte>("osm");
  const [proxima, setProxima] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<"busca" | "mais" | null>(null);
  const [parcial, setParcial] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // cada busca ganha um id: o que chegar de uma busca velha (parciais, erro, fim) é ignorado
  const idAtual = useRef(0);
  const controle = useRef<AbortController | null>(null);
  const chaveEmAndamento = useRef<string | null>(null);

  // começa uma operação nova, cancelando a anterior; devolve o sinal e "ainda é a vigente?"
  function novaOperacao() {
    controle.current?.abort();
    const ctrl = new AbortController();
    controle.current = ctrl;
    const id = ++idAtual.current;
    return { sinal: ctrl.signal, vigente: () => id === idAtual.current };
  }

  async function buscar(alvo: AlvoBusca): Promise<void> {
    if (!alvo.termo || !alvo.cidade) {
      setErro("Escolha um nicho e informe a cidade.");
      return;
    }
    const chave = chaveCache(alvo.nichoId, alvo.termo, alvo.cidade);
    // mesmo alvo já em andamento (clique duplo, Enter repetido): deixa a atual terminar
    if (chaveEmAndamento.current === chave) return;

    const { sinal, vigente } = novaOperacao();
    chaveEmAndamento.current = chave;
    setBusca(alvo);
    setErro(null);
    setProgresso("");
    setProxima(null);
    setEmpresas([]);
    setParcial(true);
    setCarregando("busca");
    try {
      localStorage.setItem(CIDADE_KEY, alvo.cidade);
    } catch {}

    try {
      // o Google pagina pelo servidor (token de próxima página): não entra no cache
      const guardado = USA_GOOGLE ? null : lerCache(chave, Date.now());
      if (guardado) {
        setFonte("osm");
        setEmpresas(guardado);
        return;
      }

      const r = USA_GOOGLE
        ? await buscarNoServidor(alvo, sinal)
        : await buscarOsm(alvo.nichoId, alvo.termo, alvo.cidade, alvo.nicho, {
            sinal,
            progresso: (m) => {
              if (vigente()) setProgresso(m);
            },
            onParcial: (lista) => {
              if (vigente()) startTransition(() => setEmpresas(lista));
            },
          }).catch((e) => {
            // navegador bloqueado pelo mapa (limite/extensão/rede): tenta a mesma busca pelo servidor
            if (!(e instanceof SemAcesso)) throw e;
            if (vigente()) setProgresso("Tentando pelo servidor…");
            return buscarNoServidor(alvo, sinal);
          });

      if (!vigente()) return;
      setFonte(r.fonte);
      setProxima(r.proximaPagina);
      setEmpresas(r.empresas);
      if (r.fonte === "osm" && !sinal.aborted) gravarCache(chave, r.empresas, Date.now());
    } catch (e) {
      // busca substituída por outra: o AbortError dela não é erro pro usuário
      if (!vigente() || sinal.aborted) return;
      setErro(mensagemDeErro(e));
    } finally {
      if (vigente()) {
        chaveEmAndamento.current = null;
        setCarregando(null);
        setParcial(false);
      }
    }
  }

  // Próxima página do Google (só existe quando a fonte é o Google, sempre pelo servidor).
  async function carregarMais(): Promise<void> {
    if (!busca || !proxima || carregando) return;
    const { sinal, vigente } = novaOperacao();
    setCarregando("mais");
    setErro(null);
    try {
      const r = await buscarNoServidor(busca, sinal, proxima);
      if (!vigente()) return;
      setFonte(r.fonte);
      setProxima(r.proximaPagina);
      setEmpresas((atual) => {
        const vistos = new Set(atual.map((e) => e.placeId));
        return [...atual, ...r.empresas.filter((e) => !vistos.has(e.placeId))];
      });
    } catch (e) {
      if (!vigente() || sinal.aborted) return;
      setErro(mensagemDeErro(e));
    } finally {
      if (vigente()) setCarregando(null);
    }
  }

  return { busca, empresas, fonte, proxima, carregando, parcial, progresso, erro, setErro, buscar, carregarMais };
}
