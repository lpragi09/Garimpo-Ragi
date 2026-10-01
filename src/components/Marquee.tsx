// Faixa corrida verde, a mesma ideia do "Submit your site" do GSAP.
export function Marquee({ itens }: { itens: string[] }) {
  const linha = [...itens, ...itens, ...itens];
  return (
    <div className="overflow-hidden bg-gradient-to-r from-lime to-lime-soft py-2.5 text-ink">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copia) => (
          <ul key={copia} aria-hidden={copia === 1} className="flex shrink-0">
            {linha.map((t, i) => (
              <li key={i} className="flex items-center gap-6 px-3 font-mono text-xs font-bold uppercase tracking-wider">
                {t}
                <span>✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
