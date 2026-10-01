export type Presenca = "sem_site" | "rede_social" | "tem_site";

export type Empresa = {
  placeId: string;
  nome: string;
  categoria: string | null;
  endereco: string | null;
  telefone: string | null;
  site: string | null;
  presenca: Presenca;
  nota: number | null;
  avaliacoes: number;
  mapsUrl: string | null;
  aberta: boolean;
};

export type BuscaResposta = {
  empresas: Empresa[];
  proximaPagina: string | null;
  demo: boolean;
};

export const STATUS = ["novo", "contatado", "negociando", "fechado", "perdido"] as const;
export type Status = (typeof STATUS)[number];

export const STATUS_LABEL: Record<Status, string> = {
  novo: "Novo",
  contatado: "Contatado",
  negociando: "Negociando",
  fechado: "Fechado",
  perdido: "Perdido",
};

export type Lead = {
  id: string;
  place_id: string;
  nome: string;
  nicho: string | null;
  cidade: string | null;
  categoria: string | null;
  endereco: string | null;
  telefone: string | null;
  site: string | null;
  presenca: Presenca;
  nota: number | null;
  avaliacoes: number;
  maps_url: string | null;
  status: Status;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};
