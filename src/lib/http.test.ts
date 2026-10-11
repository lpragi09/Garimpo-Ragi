import { describe, expect, it } from "vitest";
import { lerRespostaJson } from "./http";

describe("lerRespostaJson", () => {
  it("504/408 avisa que a busca demorou demais", async () => {
    await expect(lerRespostaJson(new Response("An error occurred", { status: 504 }))).rejects.toThrow(
      "demorou demais",
    );
  });

  it("usa data.erro quando a resposta tem JSON de erro", async () => {
    await expect(
      lerRespostaJson(new Response('{"erro":"Faça login."}', { status: 401 })),
    ).rejects.toThrow("Faça login.");
  });

  it("devolve o JSON quando a resposta está ok", async () => {
    expect(await lerRespostaJson(new Response('{"a":1}'))).toEqual({ a: 1 });
  });

  it("429/503 avisa que o mapa limitou as consultas", async () => {
    await expect(lerRespostaJson(new Response("limite", { status: 429 }))).rejects.toThrow("limitou as consultas");
  });

  it("outros status sem corpo JSON avisam erro genérico", async () => {
    await expect(lerRespostaJson(new Response("boom", { status: 500 }))).rejects.toThrow("Erro ao buscar.");
  });
});
