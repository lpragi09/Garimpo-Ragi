import { NextResponse } from "next/server";
import { buscarEmpresas, PlacesErro } from "@/lib/places";
import { usuarioAtual } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // O proxy já barra quem não está logado; aqui é a segunda trava, porque cada
  // chamada dessa rota gasta cota paga do Google.
  if (!(await usuarioAtual())) {
    return NextResponse.json({ erro: "Faça login." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const termo = String(body.termo ?? "").trim().slice(0, 80);
  const cidade = String(body.cidade ?? "").trim().slice(0, 80);
  const pagina = typeof body.pagina === "string" ? body.pagina.slice(0, 1000) : undefined;

  if (!termo || !cidade) {
    return NextResponse.json({ erro: "Escolha um nicho e informe a cidade." }, { status: 400 });
  }

  try {
    const resultado = await buscarEmpresas(`${termo} em ${cidade}`, pagina);
    return NextResponse.json(resultado);
  } catch (e) {
    const status = e instanceof PlacesErro ? e.status : 500;
    const erro = e instanceof Error ? e.message : "Erro ao buscar.";
    return NextResponse.json({ erro }, { status });
  }
}
