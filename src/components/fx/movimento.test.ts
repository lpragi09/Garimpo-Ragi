import { describe, expect, it } from "vitest";
import { podeAnimarPesado } from "./movimento";

describe("podeAnimarPesado", () => {
  it("libera em tela grande, com núcleos de sobra e sem pedido de menos movimento", () => {
    expect(podeAnimarPesado({ largura: 1440, nucleos: 8, reduzMovimento: false })).toBe(true);
  });

  it("bloqueia quando a pessoa pediu menos movimento", () => {
    expect(podeAnimarPesado({ largura: 1440, nucleos: 8, reduzMovimento: true })).toBe(false);
  });

  it("bloqueia no celular (abaixo de 768px)", () => {
    expect(podeAnimarPesado({ largura: 390, nucleos: 8, reduzMovimento: false })).toBe(false);
    expect(podeAnimarPesado({ largura: 767, nucleos: 8, reduzMovimento: false })).toBe(false);
    expect(podeAnimarPesado({ largura: 768, nucleos: 8, reduzMovimento: false })).toBe(true);
  });

  it("bloqueia em aparelho fraco (4 núcleos ou menos)", () => {
    expect(podeAnimarPesado({ largura: 1440, nucleos: 4, reduzMovimento: false })).toBe(false);
    expect(podeAnimarPesado({ largura: 1440, nucleos: 2, reduzMovimento: false })).toBe(false);
  });

  it("libera quando o navegador não informa os núcleos", () => {
    expect(podeAnimarPesado({ largura: 1440, reduzMovimento: false })).toBe(true);
  });
});
