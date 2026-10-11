import { describe, expect, it } from "vitest";
import { leadsParaCsv } from "./exportar";
import type { Lead } from "./types";

function lead(sobre: Partial<Lead> = {}): Lead {
  return {
    id: "1",
    place_id: "p1",
    nome: "Empresa",
    nicho: "Barbearia",
    cidade: "Poços de Caldas",
    categoria: null,
    endereco: "Rua A, 123",
    telefone: "35998765432",
    site: null,
    presenca: "sem_site",
    nota: null,
    avaliacoes: 0,
    maps_url: "https://maps.google.com/?q=p1",
    status: "novo",
    observacao: null,
    proximo_contato: null,
    created_at: "2026-10-05T12:00:00.000Z",
    updated_at: "2026-10-05T12:00:00.000Z",
    ...sobre,
  };
}

describe("leadsParaCsv", () => {
  it("gera CSV com BOM, cabeçalho em pt-BR e campos escapados", () => {
    const csv = leadsParaCsv([
      lead({
        nome: 'Bar "do Zé"',
        observacao: "ligar; depois\nàs 10h",
        telefone: "35998765432",
        status: "contatado",
      }),
    ]);
    const semBom = csv.replace(/^﻿/, "");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(semBom.split("\r\n")[0]).toBe(
      "Nome;Nicho;Cidade;Telefone;Presença;Status;Retornar em;Endereço;Site;Google Maps;Anotações;Salvo em",
    );
    expect(semBom).toContain('"Bar ""do Zé"""');
    expect(semBom).toContain('"ligar; depois\nàs 10h"');
    expect(semBom).toContain("(35) 99876-5432");
    expect(semBom).toContain("Contatado");
  });

  it("usa dd/mm/aaaa para 'Salvo em' e 'Retornar em', e rótulos de presença", () => {
    const csv = leadsParaCsv([
      lead({
        presenca: "rede_social",
        proximo_contato: "2026-11-03",
        created_at: "2026-10-05T12:00:00.000Z",
      }),
    ]);
    expect(csv).toContain("Só rede social");
    expect(csv).toContain("03/11/2026");
    expect(csv).toContain("05/10/2026");
  });

  it("deixa 'Retornar em' vazio quando não há proximo_contato", () => {
    const csv = leadsParaCsv([lead({ proximo_contato: null })]);
    const linhas = csv.replace(/^﻿/, "").split("\r\n");
    const colunas = linhas[1].split(";");
    // índice 6 = "Retornar em"
    expect(colunas[6]).toBe("");
  });

  it("protege campo que começa com '=', '+', '-' ou '@' contra fórmula no Excel/Sheets", () => {
    const csv = leadsParaCsv([lead({ nome: "=cmd|'/c calc'!A1", observacao: "+5 (a caminho)" })]);
    const semBom = csv.replace(/^﻿/, "");
    expect(semBom).toContain("'=cmd|'/c calc'!A1");
    expect(semBom).toContain("'+5 (a caminho)");
  });

  it("não protege telefone formatado, que nunca começa com esses caracteres", () => {
    const csv = leadsParaCsv([lead({ telefone: "35998765432" })]);
    const semBom = csv.replace(/^﻿/, "");
    expect(semBom).toContain("(35) 99876-5432");
    expect(semBom).not.toContain("'(35) 99876-5432");
  });
});
