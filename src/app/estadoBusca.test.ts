import { describe, expect, it } from "vitest";
import { estadoAposFalha, mostrarVazio, type Resultado } from "./estadoBusca";
import type { Empresa } from "@/lib/types";

const emp = (placeId: string): Empresa => ({
  placeId,
  nome: placeId,
  categoria: null,
  endereco: null,
  telefone: null,
  site: null,
  presenca: "sem_site",
  nota: null,
  avaliacoes: 0,
  mapsUrl: null,
  aberta: true,
});

const alvoNovo = { nichoId: "dentista", termo: "dentista", cidade: "Cidadeinexistente", nicho: "Dentista" };
const anterior: Resultado = {
  busca: { nichoId: "barbearia", termo: "barbearia", cidade: "Lavras, MG", nicho: "Barbearia" },
  empresas: [emp("a")],
  fonte: "osm",
  proxima: null,
};

describe("estadoAposFalha", () => {
  it("sem parciais, volta ao último resultado concluído", () => {
    expect(estadoAposFalha(anterior, alvoNovo, [])).toEqual(anterior);
  });

  it("sem parciais e sem busca anterior, volta ao estado inicial (sem busca)", () => {
    expect(estadoAposFalha(null, alvoNovo, [])).toEqual({ busca: null, empresas: [], fonte: "osm", proxima: null });
  });

  it("com parciais, mantém o que já chegou da busca nova", () => {
    const r = estadoAposFalha(anterior, alvoNovo, [emp("x"), emp("y")]);
    expect(r.busca).toBe(alvoNovo);
    expect(r.empresas.map((e) => e.placeId)).toEqual(["x", "y"]);
    expect(r.proxima).toBeNull();
  });
});

describe("mostrarVazio", () => {
  it("só mostra o aviso de vazio quando a busca terminou sem erro", () => {
    expect(mostrarVazio({ parcial: false, erro: null })).toBe(true);
    expect(mostrarVazio({ parcial: true, erro: null })).toBe(false);
    expect(mostrarVazio({ parcial: false, erro: "Não achei a cidade" })).toBe(false);
  });
});
