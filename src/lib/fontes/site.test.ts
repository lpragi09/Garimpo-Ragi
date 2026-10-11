import { describe, expect, it } from "vitest";
import { classificarSite, linkBuscaInstagram } from "./site";

describe("classificarSite", () => {
  it("reconhece rede social, site próprio e ausência de site", () => {
    expect(classificarSite("https://www.instagram.com/ze")).toBe("rede_social");
    expect(classificarSite("https://barbeariadoze.com.br")).toBe("tem_site");
    expect(classificarSite(null)).toBe("sem_site");
  });
});

describe("linkBuscaInstagram", () => {
  it("monta a busca do Google pelo Instagram, codificando o resto", () => {
    expect(linkBuscaInstagram("Zé & Cia #1", "Lavras, MG")).toBe(
      "https://www.google.com/search?q=" + encodeURIComponent('site:instagram.com "Zé & Cia #1" Lavras, MG'),
    );
  });
});
