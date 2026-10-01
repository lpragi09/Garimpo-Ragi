import "server-only";
import type { BuscaResposta, Empresa } from "../types";
import { classificarSite } from "./site";
import { FonteErro } from "./erro";

// Places API (New) — Text Search. Desligada por padrão (precisa de faturamento no
// Google Cloud); liga com FONTE_DADOS=google + GOOGLE_PLACES_API_KEY.
// https://developers.google.com/maps/documentation/places/web-service/text-search
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// `websiteUri` e telefone puxam o SKU "Enterprise", mas sem eles não dá pra saber quem está sem site.
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

export async function buscarGoogle(chave: string, termo: string, cidade: string, pageToken?: string): Promise<BuscaResposta> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": chave,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${termo} em ${cidade}`,
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
    console.error("[google]", res.status, msg);
    throw new FonteErro(
      res.status === 403
        ? "A chave do Google foi recusada. Confira a Places API (New) e o faturamento do projeto."
        : msg,
    );
  }

  const data: { places?: PlaceApi[]; nextPageToken?: string } = await res.json();
  return {
    empresas: (data.places ?? []).map(normalizar).filter((e) => e.aberta),
    proximaPagina: data.nextPageToken ?? null,
    fonte: "google",
  };
}
