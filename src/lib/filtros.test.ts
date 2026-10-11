import { describe, expect, it } from "vitest";
import { pesoContato, semSalvos } from "./filtros";
import type { Empresa } from "./types";

// Empresa completa, só com o que o teste quiser trocar.
function emp(id: string, overrides: Partial<Empresa> = {}): Empresa {
  return {
    placeId: id,
    nome: id,
    categoria: null,
    endereco: null,
    telefone: null,
    site: null,
    presenca: "sem_site",
    nota: null,
    avaliacoes: 0,
    mapsUrl: null,
    aberta: true,
    ...overrides,
  };
}

describe("semSalvos", () => {
  it("tira da lista quem já está nos leads", () => {
    expect(semSalvos([emp("a"), emp("b")], new Set(["a"])).map((e) => e.placeId)).toEqual(["b"]);
  });

  it("sem nada salvo, devolve todos na mesma ordem", () => {
    expect(semSalvos([emp("b"), emp("a")], new Set()).map((e) => e.placeId)).toEqual(["b", "a"]);
  });
});

describe("pesoContato", () => {
  it("celular vale 2 (dá WhatsApp)", () => {
    expect(pesoContato(emp("a", { telefone: "(35) 99876-5432" }))).toBe(2);
  });

  it("fixo vale 1", () => {
    expect(pesoContato(emp("a", { telefone: "(35) 3821-6855" }))).toBe(1);
  });

  it("sem telefone vale 0", () => {
    expect(pesoContato(emp("a", { telefone: null }))).toBe(0);
  });
});
