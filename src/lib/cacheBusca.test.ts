import { beforeEach, describe, expect, it } from "vitest";
import { chaveCache, gravarCache, lerCache } from "./cacheBusca";
import type { Empresa } from "./types";

// O vitest roda em "node": não há sessionStorage, então monta um em memória.
class StorageMemoria implements Storage {
  private dados = new Map<string, string>();
  get length() {
    return this.dados.size;
  }
  clear() {
    this.dados.clear();
  }
  getItem(k: string) {
    return this.dados.get(k) ?? null;
  }
  key(i: number) {
    return [...this.dados.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.dados.delete(k);
  }
  setItem(k: string, v: string) {
    this.dados.set(k, String(v));
  }
}

function emp(placeId: string): Empresa {
  return {
    placeId,
    nome: `Empresa ${placeId}`,
    categoria: null,
    endereco: null,
    telefone: null,
    site: null,
    presenca: "sem_site",
    nota: null,
    avaliacoes: 0,
    mapsUrl: null,
    aberta: true,
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "sessionStorage", { value: new StorageMemoria(), configurable: true, writable: true });
});

describe("chaveCache", () => {
  it("ignora maiúsculas, espaços nas pontas e acentos", () => {
    expect(chaveCache("barbearia", "barbearia", " Lavras, MG ")).toBe(chaveCache("barbearia", "barbearia", "lavras, mg"));
    expect(chaveCache("outro", "Floricultura", "São  João del-Rei")).toBe(
      chaveCache("outro", "floricultura", "sao joao del-rei"),
    );
  });

  it("nichos ou termos diferentes dão chaves diferentes", () => {
    expect(chaveCache("barbearia", "barbearia", "Lavras")).not.toBe(chaveCache("salao", "salao", "Lavras"));
    expect(chaveCache("outro", "floricultura", "Lavras")).not.toBe(chaveCache("outro", "autoescola", "Lavras"));
  });
});

describe("lerCache / gravarCache", () => {
  it("vale por 3 h", () => {
    gravarCache("k", [emp("a")], 0);
    expect(lerCache("k", 3 * 3600_000 - 1)?.length).toBe(1);
    expect(lerCache("k", 3 * 3600_000 + 1)).toBeNull();
    expect(lerCache("inexistente", 0)).toBeNull();
  });

  it("ignora erros do storage (cheio, bloqueado ou ausente)", () => {
    const quebrado = new StorageMemoria();
    quebrado.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    quebrado.getItem = () => {
      throw new Error("SecurityError");
    };
    Object.defineProperty(globalThis, "sessionStorage", { value: quebrado, configurable: true, writable: true });
    expect(() => gravarCache("k", [emp("a")], 0)).not.toThrow();
    expect(lerCache("k", 0)).toBeNull();
  });

  it("conteúdo corrompido conta como sem cache", () => {
    sessionStorage.setItem(`garimpo:busca:k`, "{não é json");
    expect(lerCache("k", 0)).toBeNull();
  });
});
