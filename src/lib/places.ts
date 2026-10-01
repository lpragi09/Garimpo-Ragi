import "server-only";
import type { BuscaResposta, Empresa, Presenca } from "./types";

// Places API (New) — Text Search.
// https://developers.google.com/maps/documentation/places/web-service/text-search
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Só os campos que a tela usa. `websiteUri` e telefone puxam o SKU "Enterprise",
// mas sem eles não dá pra saber quem está sem site — é o ponto do projeto.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryTypeDisplayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

// Quem coloca Instagram/iFood/Linktree como "site" no Google também não tem site de verdade.
const REDES = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "linktr.ee",
  "wa.me",
  "whatsapp.com",
  "tiktok.com",
  "ifood.com.br",
  "linkedin.com",
  "youtube.com",
  "bio.site",
  "beacons.ai",
  "business.site", // Google Sites antigo, desativado em 2024
];

export function classificarSite(site: string | null | undefined): Presenca {
  if (!site) return "sem_site";
  try {
    const host = new URL(site).hostname.replace(/^www\./, "");
    if (REDES.some((r) => host === r || host.endsWith(`.${r}`))) return "rede_social";
  } catch {
    return "sem_site";
  }
  return "tem_site";
}

type PlaceApi = {
  id: string;
  displayName?: { text: string };
  primaryTypeDisplayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
};

function normalizar(p: PlaceApi): Empresa {
  return {
    placeId: p.id,
    nome: p.displayName?.text ?? "Sem nome",
    categoria: p.primaryTypeDisplayName?.text ?? null,
    endereco: p.formattedAddress ?? null,
    telefone: p.nationalPhoneNumber ?? null,
    site: p.websiteUri ?? null,
    presenca: classificarSite(p.websiteUri),
    nota: p.rating ?? null,
    avaliacoes: p.userRatingCount ?? 0,
    mapsUrl: p.googleMapsUri ?? null,
    aberta: p.businessStatus !== "CLOSED_PERMANENTLY",
  };
}

export class PlacesErro extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export async function buscarEmpresas(textQuery: string, pageToken?: string): Promise<BuscaResposta> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return demo(textQuery, pageToken);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "pt-BR",
      regionCode: "BR",
      pageSize: 20,
      ...(pageToken ? { pageToken } : {}),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    const msg: string = corpo?.error?.message ?? `Google respondeu ${res.status}`;
    console.error("[places]", res.status, msg);
    throw new PlacesErro(
      res.status === 403
        ? "A chave do Google foi recusada. Confira se a Places API (New) está ativada no projeto."
        : msg,
    );
  }

  const data: { places?: PlaceApi[]; nextPageToken?: string } = await res.json();
  return {
    empresas: (data.places ?? []).map(normalizar).filter((e) => e.aberta),
    proximaPagina: data.nextPageToken ?? null,
    demo: false,
  };
}

// ---------------------------------------------------------------------------
// Modo demonstração: sem GOOGLE_PLACES_API_KEY a tela continua funcionando
// com dados inventados, pra dá pra mexer no layout sem gastar cota.

const PREFIXOS = ["Studio", "Casa", "Espaço", "Point", "Cantinho", "Ponto", "Recanto", "Oficina"];
const NOMES = ["do Zé", "Bela Vista", "Central", "Primavera", "São Jorge", "da Praça", "Real", "Nova Era", "Dona Maria", "Bom Jesus"];

function demo(textQuery: string, pageToken?: string): BuscaResposta {
  const pagina = Number(pageToken ?? 0);
  const [termo, cidade = "Lavras"] = textQuery.split(/ em /i);
  const empresas: Empresa[] = Array.from({ length: 12 }, (_, i) => {
    const n = pagina * 12 + i;
    const tipo = n % 5 === 0 ? "tem_site" : n % 3 === 0 ? "rede_social" : "sem_site";
    const nome = `${PREFIXOS[n % PREFIXOS.length]} ${NOMES[(n * 7) % NOMES.length]}`;
    return {
      placeId: `demo-${termo}-${n}`,
      nome,
      categoria: termo.charAt(0).toUpperCase() + termo.slice(1),
      endereco: `Rua ${NOMES[(n * 3) % NOMES.length]}, ${100 + n * 17} - Centro, ${cidade}`,
      telefone: n % 4 === 3 ? `(35) 3821-${String(1000 + n * 37).slice(-4)}` : `(35) 9${String(88000000 + n * 104729).slice(0, 4)}-${String(1000 + n * 53).slice(-4)}`,
      site: tipo === "tem_site" ? "https://exemplo.com.br" : tipo === "rede_social" ? "https://instagram.com/exemplo" : null,
      presenca: tipo,
      nota: Math.round((3.6 + ((n * 13) % 14) / 10) * 10) / 10,
      avaliacoes: (n * 37) % 260,
      mapsUrl: "https://maps.google.com",
      aberta: true,
    };
  });
  return { empresas, proximaPagina: pagina < 2 ? String(pagina + 1) : null, demo: true };
}
