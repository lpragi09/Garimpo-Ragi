import { Globe, AtSign, Star, CircleSlash } from "lucide-react";
import type { Presenca } from "@/lib/types";

export const PRESENCA = {
  sem_site: { label: "Sem site", cor: "text-lime bg-lime/10 ring-lime/30", icon: CircleSlash },
  rede_social: { label: "Só rede social", cor: "text-amber bg-amber/10 ring-amber/30", icon: AtSign },
  tem_site: { label: "Tem site", cor: "text-muted bg-white/5 ring-white/10", icon: Globe },
} satisfies Record<Presenca, unknown>;

export function PresencaBadge({ presenca }: { presenca: Presenca }) {
  const p = PRESENCA[presenca];
  const Icon = p.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${p.cor}`}>
      <Icon className="size-3.5" />
      {p.label}
    </span>
  );
}

export function Nota({ nota, avaliacoes }: { nota: number | null; avaliacoes: number }) {
  if (!nota) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="size-3.5 fill-amber text-amber" />
      <b className="font-semibold">{nota.toFixed(1).replace(".", ",")}</b>
      <span className="text-muted">({avaliacoes})</span>
    </span>
  );
}

// Lead quente = sem site de verdade, mas o negócio tem movimento no Google.
export function ehQuente(e: { presenca: Presenca; avaliacoes: number; nota: number | null }) {
  return e.presenca !== "tem_site" && e.avaliacoes >= 30 && (e.nota ?? 0) >= 4.2;
}

// Chip em pílula de vidro; ativo vira creme sólido. Altura mínima de 44 px (toque).
export function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
        ativo
          ? "border border-cream bg-cream font-semibold text-ink shadow-[0_0_24px_-6px_rgb(255_252_225/0.5)]"
          : "vidro text-cream/80 hover:border-white/25 hover:text-cream"
      }`}
    >
      {children}
    </button>
  );
}
