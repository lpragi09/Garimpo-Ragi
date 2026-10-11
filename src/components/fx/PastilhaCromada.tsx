import type { LucideIcon } from "lucide-react";

const TAMANHOS = {
  sm: { caixa: "size-10 rounded-xl", miolo: "rounded-[11px]", icone: "size-[18px]" },
  md: { caixa: "size-14 rounded-2xl", miolo: "rounded-[15px]", icone: "size-6" },
} as const;

/**
 * Ícone dentro de um "azulejo" de metal: borda em gradiente cromado,
 * miolo escuro com reflexo em cima, ícone creme com brilho.
 */
export function PastilhaCromada({
  icon: Icon,
  tamanho = "md",
}: {
  icon: LucideIcon;
  tamanho?: "sm" | "md";
}) {
  const t = TAMANHOS[tamanho];
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 p-px shadow-[0_8px_24px_-8px_rgb(0_0_0/0.8)] ${t.caixa}`}
      style={{
        backgroundImage:
          "linear-gradient(145deg, #ffffff 0%, #c9ccd3 22%, #6b6f78 48%, #2a2d33 62%, #eef0f3 100%)",
      }}
    >
      <span
        className={`grid place-items-center ${t.miolo}`}
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 30% 0%, rgb(255 255 255 / 0.14), transparent 55%), linear-gradient(180deg, #161922, #05060a)",
          boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.18), inset 0 -6px 12px rgb(0 0 0 / 0.6)",
        }}
      >
        <Icon
          className={`${t.icone} text-cream drop-shadow-[0_0_6px_rgb(255_252_225/0.45)]`}
          strokeWidth={1.75}
        />
      </span>
    </span>
  );
}
