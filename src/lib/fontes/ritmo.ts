// Ritmo de requisições: garante um intervalo mínimo entre o INÍCIO de uma chamada e o da
// próxima (é o que a política do Nominatim mede). Diferente de "esperar 1,1 s depois de cada
// resposta", o tempo que a resposta levou já conta — a próxima sai assim que pode.
const dormirPadrao = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function criarRitmo(
  intervaloMs: number,
  agora: () => number = () => Date.now(),
  dormir: (ms: number) => Promise<void> = dormirPadrao,
): () => Promise<void> {
  let ultimoInicio: number | null = null;
  // fila: chamadas simultâneas saem uma de cada vez, cada uma respeitando o intervalo
  let fila: Promise<void> = Promise.resolve();

  return () => {
    const vez = fila.then(async () => {
      if (ultimoInicio !== null) {
        const falta = intervaloMs - (agora() - ultimoInicio);
        if (falta > 0) await dormir(falta);
      }
      ultimoInicio = agora();
    });
    fila = vez.catch(() => {});
    return vez;
  };
}
