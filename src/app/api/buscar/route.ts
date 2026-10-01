import { NextResponse } from "next/server";
import { buscarEmpresas, FonteErro } from "@/lib/fontes";
import { usuarioAtual } from "@/lib/supabase/server";

// o OpenStreetMap pode levar 20–60 s em cidade grande (e tenta mais de um servidor)
export const maxDuration = 180;

export async function POST(request: Request) {
  // O proxy já barra quem não está logado; aqui é a segunda trava.
  if (!(await usuarioAtual())) {
    return NextResponse.json({ erro: "Faça login." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const nichoId = String(body.nicho ?? "").trim().slice(0, 40);
  const termo = String(body.termo ?? "").trim().slice(0, 80);
  const categoria = String(body.categoria ?? termo).trim().slice(0, 80);
  const cidade = String(body.cidade ?? "").trim().slice(0, 80);
  const pagina = typeof body.pagina === "string" ? body.pagina.slice(0, 1000) : undefined;

  if (!termo || !cidade) {
    return NextResponse.json({ erro: "Escolha um nicho e informe a cidade." }, { status: 400 });
  }

  try {
    const resultado = await buscarEmpresas({ nichoId, termo, categoria, cidade, pagina });
    return NextResponse.json(resultado);
  } catch (e) {
    const status = e instanceof FonteErro ? e.status : 500;
    const erro = e instanceof FonteErro ? e.message : "Erro ao buscar.";
    if (!(e instanceof FonteErro)) console.error("[buscar]", e);
    return NextResponse.json({ erro }, { status });
  }
}
