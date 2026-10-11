import { describe, expect, it } from "vitest";
import { chaveEmpresa, SemAcesso } from "./osm";
import { FonteErro } from "./erro";
import type { Empresa } from "../types";

// Helper local: monta uma Empresa completa, só sobrescrevendo o que o teste precisa.
function emp(override: Partial<Empresa> = {}): Empresa {
  return {
    placeId: "osm-N-0",
    nome: "Empresa Teste",
    categoria: null,
    endereco: null,
    telefone: null,
    site: null,
    presenca: "sem_site",
    nota: null,
    avaliacoes: 0,
    mapsUrl: null,
    aberta: true,
    ...override,
  };
}

describe("chaveEmpresa", () => {
  it("sem telefone, usa o placeId (evita tratar nomes iguais como duplicado)", () => {
    expect(chaveEmpresa(emp({ placeId: "osm-N-1", nome: "Barbearia Central", telefone: null }))).not.toBe(
      chaveEmpresa(emp({ placeId: "osm-N-2", nome: "Barbearia Central", telefone: null })),
    );
  });

  it("com telefone, usa nome em minúsculas + telefone", () => {
    expect(chaveEmpresa(emp({ placeId: "osm-N-1", nome: "Barbearia Central", telefone: "35999998888" }))).toBe(
      "barbearia central|35999998888",
    );
  });
});

describe("SemAcesso", () => {
  it("é um FonteErro com status 503 e mensagem de limite", () => {
    const erro = new SemAcesso();
    expect(erro).toBeInstanceOf(FonteErro);
    expect(erro.status).toBe(503);
    expect(erro.message).toMatch("limitou as consultas");
  });
});
