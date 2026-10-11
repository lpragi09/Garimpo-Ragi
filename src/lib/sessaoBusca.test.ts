import { beforeEach, describe, expect, it } from "vitest";
import { lerSessao, salvarSessao, type SessaoBusca } from "./sessaoBusca";

// O vitest roda em "node": sessionStorage em memória.
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

const sessao: SessaoBusca = {
  alvo: { nichoId: "todos", termo: "todos", cidade: "Lavras, MG", nicho: "Todos os nichos" },
  filtro: "sem_site",
  ordem: "nome",
  soTelefone: true,
  esconderSalvos: false,
  nichoFiltro: "Restaurante",
  pagina: 3,
};

describe("sessão da busca (volta depois do F5)", () => {
  beforeEach(() => {
    globalThis.sessionStorage = new StorageMemoria();
  });

  it("salva e lê de volta a busca, os filtros e a página", () => {
    salvarSessao(sessao);
    expect(lerSessao()).toEqual(sessao);
  });

  it("sem nada salvo, devolve null", () => {
    expect(lerSessao()).toBeNull();
  });

  it("dado quebrado ou sem cidade não restaura nada", () => {
    sessionStorage.setItem("garimpo:sessao", "{não é json");
    expect(lerSessao()).toBeNull();
    sessionStorage.setItem("garimpo:sessao", JSON.stringify({ ...sessao, alvo: { ...sessao.alvo, cidade: "" } }));
    expect(lerSessao()).toBeNull();
  });

  it("campos de filtro inválidos voltam pro padrão, a busca continua", () => {
    sessionStorage.setItem("garimpo:sessao", JSON.stringify({ alvo: sessao.alvo, filtro: "xyz", pagina: -4 }));
    expect(lerSessao()).toEqual({
      alvo: sessao.alvo,
      filtro: "oportunidades",
      ordem: "contato",
      soTelefone: false,
      esconderSalvos: true,
      nichoFiltro: "",
      pagina: 1,
    });
  });
});
