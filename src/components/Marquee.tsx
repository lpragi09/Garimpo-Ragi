// Faixa corrida escura com texto cromado e um fio de luz verde em cima e embaixo.
export function Marquee({ itens }: { itens: string[] }) {
  const linha = [...itens, ...itens, ...itens];
  return (
    <div className="relative overflow-hidden border-y border-lime/25 bg-panel py-3 shadow-[0_0_32px_-12px_rgb(10_228_72/0.35)]">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copia) => (
          <ul key={copia} aria-hidden={copia === 1} className="flex shrink-0">
            {linha.map((t, i) => (
              <li
                key={i}
                className="flex items-center gap-6 px-3 font-display text-sm font-bold uppercase tracking-[0.18em]"
              >
                <span className="texto-cromado">{t}</span>
                <span aria-hidden className="text-lime">✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
      {/* bordas somem no preto, sem corte seco */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-panel to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-panel to-transparent"
      />
    </div>
  );
}
