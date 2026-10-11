import { formatarTelefone } from "./contato";
import { STATUS_LABEL, type Lead, type Presenca } from "./types";

const PRESENCA_LABEL: Record<Presenca, string> = {
  sem_site: "Sem site",
  rede_social: "Só rede social",
  tem_site: "Tem site",
};

const CABECALHO = [
  "Nome",
  "Nicho",
  "Cidade",
  "Telefone",
  "Presença",
  "Status",
  "Retornar em",
  "Endereço",
  "Site",
  "Google Maps",
  "Anotações",
  "Salvo em",
];

// "AAAA-MM-DD" (data local, sem hora) -> "DD/MM/AAAA".
function dataIsoParaBr(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// timestamp ISO (com hora) -> "DD/MM/AAAA" no horário local de quem exporta.
function timestampParaBr(iso: string) {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getFullYear()}`;
}

// Escapa um campo pro formato CSV (separador ";"): entre aspas se tiver ';', '"' ou quebra de linha.
function campoCsv(valor: string) {
  if (/[";\n\r]/.test(valor)) {
    return `"${valor.replaceAll('"', '""')}"`;
  }
  return valor;
}

function linhaLead(l: Lead): string {
  const colunas = [
    l.nome,
    l.nicho ?? "",
    l.cidade ?? "",
    l.telefone ? formatarTelefone(l.telefone) : "",
    PRESENCA_LABEL[l.presenca],
    STATUS_LABEL[l.status],
    l.proximo_contato ? dataIsoParaBr(l.proximo_contato) : "",
    l.endereco ?? "",
    l.site ?? "",
    l.maps_url ?? "",
    l.observacao ?? "",
    timestampParaBr(l.created_at),
  ];
  return colunas.map(campoCsv).join(";");
}

// CSV em pt-BR (separador ";", BOM pro Excel reconhecer acentos) com um lead por linha.
export function leadsParaCsv(leads: Lead[]): string {
  const linhas = [CABECALHO.join(";"), ...leads.map(linhaLead)];
  return "﻿" + linhas.join("\r\n");
}

// Dispara o download do CSV no navegador.
export function baixarCsv(nomeArquivo: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
