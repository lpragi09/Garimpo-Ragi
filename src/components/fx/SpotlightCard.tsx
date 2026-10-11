"use client";

import type { PointerEvent, ReactNode } from "react";

/**
 * Cartão com um holofote verde que segue o mouse. A posição vai direto
 * nas variáveis CSS `--mx/--my` (sem re-render do React).
 */
export function SpotlightCard({
  as: Tag = "div",
  className = "",
  children,
}: {
  as?: "article" | "div" | "li";
  className?: string;
  children: ReactNode;
}) {
  function mover(e: PointerEvent<HTMLElement>) {
    // no toque o holofote só atrapalharia
    if (e.pointerType === "touch") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <Tag onPointerMove={mover} className={`group/spot relative ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(240px at var(--mx, 50%) var(--my, 50%), rgb(10 228 72 / 0.10), transparent)",
        }}
      />
      {children}
    </Tag>
  );
}
