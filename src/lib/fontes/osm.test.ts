import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarOsm, chaveEmpresa, SemAcesso } from "./osm";
import { FonteErro } from "./erro";
import type { Empresa } from "../types";

// Helper local: monta uma Empresa completa, só sobrescrevendo o que o teste precisa.
function emp(override: Partial<Empresa> = {}): Empresa {
  return {
    placeId: "osm-N-0",
    nome: "Empresa Teste",
    categoria: null,
    endereco: null,
    telefone: null,
    site: null,
    presenca: "sem_site",
    nota: null,
    avaliacoes: 0,
    mapsUrl: null,
    aberta: true,
    ...override,
  };
}

describe("chaveEmpresa", () => {
  it("sem telefone, usa o placeId (evita tratar nomes iguais como duplicado)", () => {
    expect(chaveEmpresa(emp({ placeId: "osm-N-1", nome: "Barbearia Central", telefone: null }))).not.toBe(
      chaveEmpresa(emp({ placeId: "osm-N-2", nome: "Barbearia Central", telefone: null })),
    );
  });

  it("com telefone, usa nome em minúsculas + telefone", () => {
    expect(chaveEmpresa(emp({ placeId: "osm-N-1", nome: "Barbearia Central", telefone: "35999998888" }))).toBe(
      "barbearia central|35999998888",
    );
  });
});

describe("SemAcesso", () => {
  it("é um FonteErro com status 503 e mensagem de limite", () => {
    const erro = new SemAcesso();
    expect(erro).toBeInstanceOf(FonteErro);
    expect(erro.status).toBe(503);
    expect(erro.message).toMatch("limitou as consultas");
  });
});

// ---------- buscarOsm com fetch falso (sem rede) ----------

type Chamada = { q: string; excluir: string[] };

// Photon acha "Lavras"; o Nominatim devolve sempre página cheia (40) com ids novos,
// pra forçar a paginação até o limite.
function mapaFalso() {
  const chamadas: Chamada[] = [];
  let proximoId = 1;
  const fetchFalso = vi.fn(async (url: string | URL) => {
    const u = new URL(String(url));
    if (u.hostname === "photon.komoot.io") {
      return Response.json({
        features: [
          {
            properties: { name: "Lavras", osm_type: "R", type: "city", countrycode: "BR", extent: [-45.1, -21.1, -44.9, -21.3] },
          },
        ],
      });
    }
    const excluir = u.searchParams.get("exclude_place_ids");
    chamadas.push({ q: u.searchParams.get("q") ?? "", excluir: excluir ? excluir.split(",") : [] });
    const lugares = Array.from({ length: 40 }, () => {
      const id = proximoId++;
      return {
        place_id: id,
        category: "shop",
        osm_type: "node",
        osm_id: id,
        name: `Lugar ${id}`,
        extratags: {},
        address: { city: "Lavras" },
      };
    });
    return Response.json(lugares);
  });
  return { chamadas, fetchFalso };
}

// roda a busca deixando os timers falsos (ritmo de 1,1 s) andarem
async function rodar<T>(p: Promise<T>): Promise<T> {
  let fim = false;
  p.then(
    () => (fim = true),
    () => (fim = true),
  );
  while (!fim) await vi.advanceTimersByTimeAsync(1100);
  return p;
}

describe("buscarOsm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("chama onParcial após cada página com a lista acumulada (cópia)", async () => {
    const { chamadas, fetchFalso } = mapaFalso();
    vi.stubGlobal("fetch", fetchFalso);
    const parciais: Empresa[][] = [];
    const r = await rodar(
      buscarOsm("dentista", "dentista", "Lavras, MG", "Dentista", { onParcial: (l) => parciais.push(l) }),
    );
    expect(chamadas).toHaveLength(4); // MAX_PAGINAS
    expect(parciais.map((l) => l.length)).toEqual([40, 80, 120, 160]);
    expect(parciais[0]).not.toBe(parciais[1]);
    expect(r.empresas).toHaveLength(160);
  });

  it("compartilha a lista de exclusão entre as consultas do nicho (no máx. 150 ids)", async () => {
    const { chamadas, fetchFalso } = mapaFalso();
    vi.stubGlobal("fetch", fetchFalso);
    await rodar(buscarOsm("clinica", "clínica", "Lavras, MG", "Clínica"));
    expect(chamadas.map((c) => c.q)).toEqual([
      ...Array(4).fill("[amenity=clinic]"),
      ...Array(4).fill("[amenity=doctors]"),
    ]);
    const primeiraDaSegunda = chamadas[4];
    expect(primeiraDaSegunda.excluir).toHaveLength(150);
    expect(primeiraDaSegunda.excluir.at(-1)).toBe("160"); // os mais recentes ficam
  });

  it("etiquetas genéricas filtradas por nome (hairdresser/beauty) param em 2 páginas", async () => {
    const { chamadas, fetchFalso } = mapaFalso();
    vi.stubGlobal("fetch", fetchFalso);
    await rodar(buscarOsm("salao", "salão", "Lavras, MG", "Salão"));
    expect(chamadas.map((c) => c.q)).toEqual([
      "[shop=hairdresser]",
      "[shop=hairdresser]",
      "[shop=beauty]",
      "[shop=beauty]",
    ]);
  });

  it("para quando o sinal é abortado", async () => {
    const { chamadas, fetchFalso } = mapaFalso();
    vi.stubGlobal("fetch", fetchFalso);
    const ctrl = new AbortController();
    const p = buscarOsm("dentista", "dentista", "Lavras, MG", "Dentista", {
      sinal: ctrl.signal,
      onParcial: () => ctrl.abort(),
    });
    await expect(rodar(p)).rejects.toMatchObject({ name: "AbortError" });
    expect(chamadas).toHaveLength(1);
  });
});
