import { describe, expect, it } from "vitest";
import { ehCelular, linkWhatsApp, montarMensagem } from "./contato";

describe("montarMensagem", () => {
  it("não interpreta $ do nome como padrão de substituição", () => {
    expect(montarMensagem("{nome}", { nome: "Ca$h Barber$$ $' $&" })).toBe("Ca$h Barber$$ $' $&");
  });

  it("troca {nicho} pelo nicho em minúsculas", () => {
    expect(montarMensagem("{nome} é {nicho}", { nome: "Zé", nicho: "Barbearia" })).toBe("Zé é barbearia");
  });

  it("usa 'seu negócio' quando não tem nicho", () => {
    expect(montarMensagem("{nome} é {nicho}", { nome: "Zé" })).toBe("Zé é seu negócio");
  });

  it("usa 'sua cidade' quando a cidade é null", () => {
    expect(montarMensagem("Oi {nome} de {cidade}", { nome: "Zé", cidade: null })).toBe("Oi Zé de sua cidade");
  });
});

describe("ehCelular", () => {
  it("reconhece celular (9 dígitos) e fixo", () => {
    expect(ehCelular("(35) 99876-5432")).toBe(true);
    expect(ehCelular("(35) 3821-6855")).toBe(false);
  });
});

describe("linkWhatsApp", () => {
  it("monta o link do wa.me com a mensagem codificada", () => {
    expect(linkWhatsApp("(35) 99876-5432", "a b")).toBe("https://wa.me/5535998765432?text=a%20b");
  });
});
