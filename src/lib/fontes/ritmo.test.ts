import { describe, expect, it } from "vitest";
import { criarRitmo } from "./ritmo";

describe("criarRitmo", () => {
  it("espera só o que falta desde o início da chamada anterior (a primeira não espera)", async () => {
    // relógio falso
    let t = 0;
    const dormidas: number[] = [];
    const ritmo = criarRitmo(1100, () => t, async (ms) => {
      dormidas.push(ms);
      t += ms;
    });
    await ritmo();
    t += 800;
    await ritmo();
    t += 1500;
    await ritmo();
    expect(dormidas).toEqual([300]); // 1ª não espera; 2ª espera 1100-800; 3ª já passou 1500
  });

  it("chamadas simultâneas saem em fila, cada uma 1 intervalo depois da outra", async () => {
    let t = 0;
    const inicios: number[] = [];
    const ritmo = criarRitmo(1000, () => t, async (ms) => {
      t += ms;
    });
    await Promise.all([0, 1, 2].map(() => ritmo().then(() => inicios.push(t))));
    expect(inicios).toEqual([0, 1000, 2000]);
  });
});
