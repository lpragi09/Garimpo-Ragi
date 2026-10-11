import { describe, expect, it } from "vitest";
import { ordenarPorRetorno, situacaoRetorno } from "./retorno";
import type { Lead } from "./types";

function l(id: string, proximo_contato: string | null): Lead {
  return {
    id,
    place_id: id,
    nome: id,
    nicho: null,
    cidade: null,
    categoria: null,
    endereco: null,
    telefone: null,
    site: null,
    presenca: "sem_site",
    nota: null,
    avaliacoes: 0,
    maps_url: null,
    status: "novo",
    observacao: null,
    proximo_contato,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("situacaoRetorno", () => {
  const agora = new Date(2026, 9, 11, 23, 30);

  it("retorna null sem data", () => {
    expect(situacaoRetorno(null, agora)).toBeNull();
    expect(situacaoRetorno(undefined, agora)).toBeNull();
  });

  it("classifica atrasado, hoje e futuro comparando no horário local", () => {
    expect(situacaoRetorno("2026-10-10", agora)).toBe("atrasado");
    expect(situacaoRetorno("2026-10-11", agora)).toBe("hoje");
    expect(situacaoRetorno("2026-10-12", agora)).toBe("futuro");
  });
});

describe("ordenarPorRetorno", () => {
  const agora = new Date(2026, 9, 11, 23, 30);

  it("ordena atrasados (mais antigo), hoje, futuros (mais próximo) e sem data por último", () => {
    const resultado = ordenarPorRetorno(
      [l("a", null), l("b", "2026-10-20"), l("c", "2026-10-01"), l("d", "2026-10-11")],
      agora,
    );
    expect(resultado.map((x) => x.id)).toEqual(["c", "d", "b", "a"]);
  });
});
