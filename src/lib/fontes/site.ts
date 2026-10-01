import type { Presenca } from "../types";

// Quem coloca Instagram/iFood/Linktree como "site" também não tem site de verdade.
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

// Link pra conferir o negócio no Google Maps (só abre a busca, não usa API nenhuma).
export function linkGoogleMaps(nome: string, cidade: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nome} ${cidade}`)}`;
}
