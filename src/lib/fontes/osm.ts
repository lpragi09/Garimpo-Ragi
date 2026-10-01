import type { BuscaResposta, Empresa } from "../types";
import { classificarSite, linkGoogleMaps } from "./site";
import { FonteErro } from "./erro";

// OpenStreetMap: grátis, sem chave e sem cartão.
// Nominatim acha a cidade; Overpass lista os estabelecimentos dela.
//
// Roda NO NAVEGADOR: os servidores públicos limitam por IP, e os IPs da Vercel são
// compartilhados com milhares de sites (vivem tomando 504). Do navegador sai pelo IP
// de quem está usando, e o Referer identifica o app como a política do Nominatim pede:
// https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Servidores públicos do Overpass que aceitam chamada do navegador (CORS).
// Se um estiver lotado (504/429), tenta o próximo.
const OVERPASS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

// Teto por tentativa e no total — a tela nunca fica carregando pra sempre.
const TEMPO_TENTATIVA = 40_000;
const TEMPO_TOTAL = 100_000;

// Nicho → etiquetas do OSM (https://wiki.openstreetmap.org/wiki/Map_features).
// No Overpass vai só chave=valor, que usa índice e responde rápido até em São Paulo.
// Filtro por nome com regex lá dentro estoura o tempo em cidade grande, então ele roda aqui.
type Tags = Record<string, string>;
type FiltroNicho = { tags: string[]; manter?: (t: Tags) => boolean };

const nomeTem = (re: RegExp) => (t: Tags) => re.test(t.name ?? "");

const FILTROS: Record<string, FiltroNicho> = {
  barbearia: {
    tags: ['["shop"="hairdresser"]', '["shop"="barber"]'],
    manter: (t) => t.shop === "barber" || /barber/i.test(t.hairdresser ?? "") || /barb/i.test(t.name ?? ""),
  },
  salao: { tags: ['["shop"="hairdresser"]', '["shop"="beauty"]'], manter: (t) => !/barb/i.test(t.name ?? "") },
  estetica: {
    tags: ['["shop"="beauty"]', '["shop"="cosmetics"]'],
    manter: nomeTem(/est[eé]tica|beleza|spa|depila|sobrancelha|unha|nail|esmalt|beauty/i),
  },
  dentista: { tags: ['["amenity"="dentist"]', '["healthcare"="dentist"]'] },
  clinica: { tags: ['["amenity"="clinic"]', '["amenity"="doctors"]'] },
  petshop: { tags: ['["shop"="pet"]', '["amenity"="veterinary"]', '["shop"="pet_grooming"]'] },
  academia: { tags: ['["leisure"="fitness_centre"]'] },
  restaurante: { tags: ['["amenity"="restaurant"]'] },
  padaria: { tags: ['["shop"="bakery"]', '["shop"="pastry"]'] },
  oficina: { tags: ['["shop"="car_repair"]', '["shop"="motorcycle_repair"]', '["shop"="tyres"]'] },
  advocacia: { tags: ['["office"="lawyer"]'] },
  contabilidade: { tags: ['["office"="accountant"]', '["office"="tax_advisor"]'] },
  imobiliaria: { tags: ['["office"="estate_agent"]'] },
  construcao: { tags: ['["shop"="hardware"]', '["shop"="doityourself"]', '["trade"="building_supplies"]'] },
  fotografo: { tags: ['["craft"="photographer"]', '["shop"="photo"]'] },
};

// "Outro": sem etiqueta conhecida, procura pelo nome entre lojas, serviços e escritórios.
function filtroLivre(termo: string): FiltroNicho {
  const re = termo.replace(/[.*+?^${}()|[\]\\"]/g, "\\$&");
  return { tags: ["shop", "amenity", "office", "craft"].map((k) => `["${k}"]["name"~"${re}",i]`) };
}

const LIMITE = 500;

type Recorte = { area: string; recorte: string };

const porArea = (relationId: number): Recorte => ({ area: `area(${3600000000 + relationId})->.a;`, recorte: "(area.a)" });
const porCaixa = (s: string | number, w: string | number, n: string | number, e: string | number): Recorte => ({
  area: "",
  recorte: `(${s},${w},${n},${e})`,
});

async function pegarJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

// Photon (komoot) — geocoder do OSM que aceita chamada do navegador sem frescura.
type Photon = {
  features: {
    properties: { osm_type: string; osm_id: number; osm_key: string; type: string; countrycode?: string; extent?: number[] };
  }[];
};

async function viaPhoton(cidade: string): Promise<Recorte | null> {
  const j = await pegarJson<Photon>(`https://photon.komoot.io/api/?${new URLSearchParams({ q: cidade, limit: "8" })}`);
  const br = (j?.features ?? []).map((f) => f.properties).filter((p) => p.countrycode === "BR");
  const municipio = br.find((p) => p.osm_type === "R" && ["city", "town", "village"].includes(p.type));
  if (municipio) return porArea(municipio.osm_id);
  const comCaixa = br.find((p) => p.extent?.length === 4 && ["city", "town", "village", "district", "locality"].includes(p.type));
  if (!comCaixa?.extent) return null;
  const [w, n, e, s] = comCaixa.extent; // Photon: [minLon, maxLat, maxLon, minLat]
  return porCaixa(s, w, n, e);
}

// Nominatim — reserva, caso o Photon esteja fora.
type Nominatim = { osm_type: string; osm_id: number; boundingbox: [string, string, string, string]; addresstype?: string }[];

async function viaNominatim(cidade: string): Promise<Recorte | null> {
  const lugares = await pegarJson<Nominatim>(
    `${NOMINATIM}?${new URLSearchParams({ q: cidade, format: "jsonv2", countrycodes: "br", limit: "5" })}`,
  );
  if (!lugares?.length) return null;
  const municipio = lugares.find(
    (l) => l.osm_type === "relation" && ["city", "town", "village", "municipality"].includes(l.addresstype ?? ""),
  );
  if (municipio) return porArea(municipio.osm_id);
  const [s, n, w, e] = lugares[0].boundingbox;
  return porCaixa(s, w, n, e);
}

// Devolve o recorte da busca: a área do município inteiro ou, na falta, o retângulo do lugar.
async function acharCidade(cidade: string): Promise<Recorte> {
  const achado = (await viaPhoton(cidade)) ?? (await viaNominatim(cidade));
  if (!achado) throw new FonteErro(`Não achei a cidade "${cidade}". Tente "Cidade, UF" — ex.: Lavras, MG.`, 404);
  return achado;
}

type Elemento = { type: string; id: number; tags?: Tags };

export type Progresso = (mensagem: string) => void;

async function consultarOverpass(query: string, progresso?: Progresso): Promise<Elemento[]> {
  const inicio = Date.now();
  // Os servidores públicos vivem lotados por alguns segundos: dá duas voltas na lista.
  for (const [i, url] of [...OVERPASS, ...OVERPASS].entries()) {
    const resta = TEMPO_TOTAL - (Date.now() - inicio);
    if (resta < 5_000) break;
    if (i > 0) {
      progresso?.("Servidor do mapa ocupado, tentando outro…");
      await new Promise((r) => setTimeout(r, 1500));
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(TEMPO_TENTATIVA, resta)),
      });
      if (res.ok) {
        const data: { elements?: Elemento[] } = await res.json();
        return data.elements ?? [];
      }
      console.warn("[osm]", url, res.status);
    } catch (e) {
      console.warn("[osm]", url, e instanceof Error ? e.message : e);
    }
  }
  throw new FonteErro("Os servidores do OpenStreetMap estão lotados agora. Tente de novo em 1 minuto.", 503);
}

function primeiroTelefone(t: Tags) {
  const bruto = t["contact:mobile"] || t["contact:whatsapp"] || t.phone || t["contact:phone"] || t.mobile;
  return bruto?.split(/[;,/]/)[0].trim() || null;
}

function siteOuRede(t: Tags) {
  const site = t.website || t["contact:website"] || t.url;
  if (site) return site.startsWith("http") ? site : `https://${site}`;
  const insta = t["contact:instagram"] || t.instagram;
  if (insta) return insta.startsWith("http") ? insta : `https://instagram.com/${insta.replace(/^@/, "")}`;
  const face = t["contact:facebook"] || t.facebook;
  if (face) return face.startsWith("http") ? face : `https://facebook.com/${face}`;
  return null;
}

function normalizar(el: Elemento, cidade: string, categoria: string): Empresa | null {
  const t = el.tags ?? {};
  if (!t.name) return null; // sem nome não dá pra prospectar
  if (t["disused:shop"] || t["disused:amenity"]) return null;
  const site = siteOuRede(t);
  const rua = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", ");
  const endereco = [rua, t["addr:suburb"], t["addr:city"]].filter(Boolean).join(" - ") || null;
  return {
    placeId: `osm-${el.type}-${el.id}`,
    nome: t.name,
    categoria,
    endereco,
    telefone: primeiroTelefone(t),
    site,
    presenca: classificarSite(site),
    nota: null,
    avaliacoes: 0,
    mapsUrl: linkGoogleMaps(t.name, cidade),
    aberta: true,
  };
}

export async function buscarOsm(
  nichoId: string,
  termo: string,
  cidade: string,
  categoria: string,
  progresso?: Progresso,
): Promise<BuscaResposta> {
  progresso?.("Localizando a cidade…");
  const { area, recorte } = await acharCidade(cidade);
  progresso?.("Consultando o mapa… em cidade grande leva uns 20 segundos.");
  const filtro = FILTROS[nichoId] ?? filtroLivre(termo);

  const partes = filtro.tags.map((f) => `nwr${f}${recorte};`).join("");
  const elementos = await consultarOverpass(
    `[out:json][timeout:40];${area}(${partes});out center tags ${LIMITE};`,
    progresso,
  );

  const vistos = new Set<string>();
  const empresas: Empresa[] = [];
  for (const el of elementos) {
    if (filtro.manter && !filtro.manter(el.tags ?? {})) continue;
    const e = normalizar(el, cidade, categoria);
    if (!e) continue;
    // o mesmo negócio às vezes está como ponto e como prédio
    const chave = `${e.nome.toLowerCase()}|${e.telefone ?? ""}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    empresas.push(e);
  }
  return { empresas, proximaPagina: null, fonte: "osm" };
}
