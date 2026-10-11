import { afterEach, describe, expect, it } from "vitest";
import { combinarSinais, lerRespostaJson } from "./http";

describe("combinarSinais", () => {
  const original = AbortSignal.any;
  afterEach(() => {
    AbortSignal.any = original;
  });

  // navegadores antigos (Safari < 17.4, Chrome < 116, Firefox < 124) não têm AbortSignal.any
  for (const [nome, semAny] of [
    ["com AbortSignal.any", false],
    ["sem AbortSignal.any (fallback)", true],
  ] as const) {
    describe(nome, () => {
      it("aborta quando qualquer um aborta, levando o motivo", () => {
        if (semAny) (AbortSignal as { any?: unknown }).any = undefined;
        const a = new AbortController();
        const b = new AbortController();
        const s = combinarSinais(a.signal, undefined, b.signal);
        expect(s.aborted).toBe(false);
        const motivo = new Error("cancelado");
        b.abort(motivo);
        expect(s.aborted).toBe(true);
        expect(s.reason).toBe(motivo);
      });

      it("já nasce abortado se algum sinal já estava abortado", () => {
        if (semAny) (AbortSignal as { any?: unknown }).any = undefined;
        const a = new AbortController();
        a.abort("antes");
        const s = combinarSinais(new AbortController().signal, a.signal);
        expect(s.aborted).toBe(true);
        expect(s.reason).toBe("antes");
      });
    });
  }
});

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
