import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, supabaseLigado } from "@/lib/supabase/config";
import { emailPermitido } from "@/lib/acesso";

// Primeira trava: toda URL passa por aqui (/, /leads, /home, /qualquer-coisa, /api/...).
// Sem sessão válida de um e-mail permitido, o máximo que se vê é a tela de login.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const naLogin = pathname === "/login";
  const ehApi = pathname.startsWith("/api/");

  if (!supabaseLigado) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Configure o Supabase antes de publicar.", { status: 503 });
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() confere o token com o Supabase (getSession() só leria o cookie, que dá pra forjar).
  const { data } = await supabase.auth.getUser();
  const liberado = emailPermitido(data.user?.email);

  if (liberado) {
    if (naLogin) return NextResponse.redirect(new URL("/", request.url));
    return semCache(response);
  }

  if (naLogin) return semCache(response);

  if (ehApi) {
    return NextResponse.json({ erro: "Faça login." }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  if (data.user) {
    // logado, mas com e-mail fora da lista: a tela de login encerra essa sessão
    login.searchParams.set("erro", "acesso");
  } else if (pathname !== "/") {
    login.searchParams.set("de", pathname + search);
  }
  const redirect = NextResponse.redirect(login);
  // leva junto cookies renovados/limpos pelo Supabase
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return semCache(redirect);
}

// Páginas logadas nunca ficam em cache compartilhado (CDN/proxy de terceiros).
function semCache(res: NextResponse) {
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  // Tudo, exceto os arquivos do próprio Next e o favicon.
  matcher: ["/((?!_next/static/|_next/image|favicon\\.ico$).*)"],
};
