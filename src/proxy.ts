import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, supabaseLigado } from "@/lib/supabase/config";

// Ferramenta de uso próprio: tudo fica atrás do login, menos a própria tela de login.
export async function proxy(request: NextRequest) {
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

  const { data } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const naLogin = pathname.startsWith("/login");

  if (!data.user && !naLogin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Faça login." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (data.user && naLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
