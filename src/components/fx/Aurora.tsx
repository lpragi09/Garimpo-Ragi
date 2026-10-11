"use client";

import { useEffect, useRef } from "react";
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";

// Cores da aurora: verde neon, violeta e ciano da paleta.
const CORES = ["#0ae448", "#9d95ff", "#00bae2"] as const;
// Quanto menor, mais lenta. A aurora deve "respirar", não dançar.
const VELOCIDADE = 0.35;

const VERTICE = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENTO = /* glsl */ `
precision highp float;

uniform float uTempo;
uniform vec3 uCor1;
uniform vec3 uCor2;
uniform vec3 uCor3;
varying vec2 vUv;

// Ruído simplex 2D (Ashima Arts / Ian McEwan, licença MIT).
vec3 permuta(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float ruido(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permuta(permuta(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Degradê verde -> violeta -> ciano ao longo da tela.
vec3 rampa(float x) {
  x = clamp(x, 0.0, 1.0);
  if (x < 0.5) return mix(uCor1, uCor2, x * 2.0);
  return mix(uCor2, uCor3, (x - 0.5) * 2.0);
}

// Uma "cortina" de luz: linha ondulada pelo ruído, que espalha pra cima
// (como aurora de verdade) e corta mais seco por baixo.
float faixa(vec2 uv, float desloc, float t) {
  float n = ruido(vec2(uv.x * 1.4 + desloc, t * 0.12 + desloc));
  float n2 = ruido(vec2(uv.x * 3.2 - t * 0.07, desloc * 2.0)) * 0.35;
  float centro = 0.64 + (n + n2) * 0.14 - desloc * 0.04;
  float d = uv.y - centro;
  float largura = d > 0.0 ? 0.20 : 0.05;
  return exp(-(d * d) / (largura * largura));
}

void main() {
  vec2 uv = vUv;
  float t = uTempo;

  float a = faixa(uv, 0.0, t) * 0.85
          + faixa(uv, 1.7, t) * 0.55
          + faixa(uv, 3.1, t) * 0.40;

  // estrias verticais bem sutis, pra dar textura de cortina
  a *= 0.8 + 0.2 * ruido(vec2(uv.x * 14.0, t * 0.04));

  vec3 cor = rampa(uv.x + 0.15 * ruido(vec2(uv.y * 1.5, t * 0.05)));

  // some em direção ao pé da seção, pra emendar no fundo da página
  a *= smoothstep(0.0, 0.4, uv.y);
  a = clamp(a, 0.0, 1.0) * 0.65;

  // alfa pré-multiplicado: por baixo fica o preto da página
  gl_FragColor = vec4(cor * a, a);
}
`;

/**
 * Aurora em WebGL (ogl). Só deve ser montada quando `podeAnimarPesado`
 * libera — quem decide é o `AuroraFundo`. Ocupa 100% do pai.
 */
export default function Aurora({
  className = "",
  onFalha,
}: {
  className?: string;
  /** Chamado se o WebGL não iniciar ou o contexto for perdido. */
  onFalha?: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  // guarda o callback mais recente sem reiniciar o WebGL a cada render
  const falhaRef = useRef(onFalha);
  useEffect(() => {
    falhaRef.current = onFalha;
  }, [onFalha]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;

    let renderer: Renderer | undefined;
    let programa: Program;
    let malha: Mesh;
    try {
      // pode lançar (GPU desligada, modo privado...) ou vir sem contexto
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
      });
      if (!renderer.gl) throw new Error("WebGL indisponível");
      renderer.gl.clearColor(0, 0, 0, 0);
      programa = new Program(renderer.gl, {
        vertex: VERTICE,
        fragment: FRAGMENTO,
        uniforms: {
          uTempo: { value: 0 },
          uCor1: { value: new Color(CORES[0]) },
          uCor2: { value: new Color(CORES[1]) },
          uCor3: { value: new Color(CORES[2]) },
        },
      });
      malha = new Mesh(renderer.gl, { geometry: new Triangle(renderer.gl), program: programa });
    } catch {
      // libera o contexto, se chegou a ser criado
      renderer?.gl?.getExtension("WEBGL_lose_context")?.loseContext();
      falhaRef.current?.();
      return;
    }

    const r = renderer;
    const gl = r.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    el.appendChild(canvas);

    // contexto perdido: nunca mais desenha; o pai volta pro gradiente CSS
    let perdido = false;

    const redimensionar = () => {
      if (perdido) return;
      r.setSize(el.clientWidth || 1, el.clientHeight || 1);
      // desenha um quadro mesmo parado, pra não ficar em branco após resize
      r.render({ scene: malha });
    };
    const ro = new ResizeObserver(redimensionar);
    ro.observe(el);
    redimensionar();

    let quadro = 0;
    let visivel = true;
    let tempoAcumulado = 0;
    let ultimo = performance.now();

    const desenhar = (agora: number) => {
      if (perdido) return;
      // conta só o tempo em que estava rodando, sem "pulo" ao voltar
      tempoAcumulado += Math.min(agora - ultimo, 100);
      ultimo = agora;
      programa.uniforms.uTempo.value = (tempoAcumulado / 1000) * VELOCIDADE;
      r.render({ scene: malha });
      quadro = requestAnimationFrame(desenhar);
    };

    const atualizar = () => {
      const rodar = !perdido && visivel && !document.hidden;
      if (rodar && !quadro) {
        ultimo = performance.now();
        quadro = requestAnimationFrame(desenhar);
      } else if (!rodar && quadro) {
        cancelAnimationFrame(quadro);
        quadro = 0;
      }
    };

    const io = new IntersectionObserver(([entrada]) => {
      visivel = entrada?.isIntersecting ?? false;
      atualizar();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", atualizar);

    const aoPerderContexto = (e: Event) => {
      e.preventDefault();
      perdido = true;
      cancelAnimationFrame(quadro);
      quadro = 0;
      falhaRef.current?.();
    };
    canvas.addEventListener("webglcontextlost", aoPerderContexto);

    atualizar();

    return () => {
      cancelAnimationFrame(quadro);
      quadro = 0;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", atualizar);
      canvas.removeEventListener("webglcontextlost", aoPerderContexto);
      if (!perdido) {
        programa.remove();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      canvas.remove();
    };
  }, []);

  return <div ref={caixa} aria-hidden className={`h-full w-full ${className}`} />;
}
