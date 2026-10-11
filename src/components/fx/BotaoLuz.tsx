import type { ButtonHTMLAttributes } from "react";

/**
 * Botão principal: verde neon, com a luz correndo pela borda (`borda-luz`)
 * e brilho que cresce no hover. Altura mínima de 56 px.
 */
export function BotaoLuz({
  className = "",
  type = "button",
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`borda-luz inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 font-semibold text-ink [--borda-luz-fundo:var(--color-lime)] shadow-[0_0_24px_-4px_rgb(10_228_72/0.45)] transition-[box-shadow,filter] duration-300 hover:shadow-[0_0_48px_0_rgb(10_228_72/0.65)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${className}`}
      {...resto}
    />
  );
}
