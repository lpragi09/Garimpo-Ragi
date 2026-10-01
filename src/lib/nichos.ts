import {
  Car,
  Dumbbell,
  Dog,
  Hammer,
  Croissant,
  Home,
  Scale,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Calculator,
  Camera,
  type LucideIcon,
} from "lucide-react";

export type Nicho = {
  id: string;
  label: string;
  // termo que vai pra busca do Google ("<termo> em <cidade>")
  termo: string;
  icon: LucideIcon;
};

// Ordem = os que mais costumam estar sem site primeiro.
export const NICHOS: Nicho[] = [
  { id: "barbearia", label: "Barbearia", termo: "barbearia", icon: Scissors },
  { id: "salao", label: "Salão de beleza", termo: "salão de beleza", icon: Sparkles },
  { id: "estetica", label: "Estética", termo: "clínica de estética", icon: Sparkles },
  { id: "dentista", label: "Dentista", termo: "dentista", icon: Smile },
  { id: "clinica", label: "Clínica", termo: "clínica médica", icon: Stethoscope },
  { id: "petshop", label: "Pet shop", termo: "pet shop", icon: Dog },
  { id: "academia", label: "Academia", termo: "academia", icon: Dumbbell },
  { id: "restaurante", label: "Restaurante", termo: "restaurante", icon: UtensilsCrossed },
  { id: "padaria", label: "Padaria", termo: "padaria", icon: Croissant },
  { id: "oficina", label: "Oficina", termo: "oficina mecânica", icon: Car },
  { id: "advocacia", label: "Advocacia", termo: "escritório de advocacia", icon: Scale },
  { id: "contabilidade", label: "Contabilidade", termo: "escritório de contabilidade", icon: Calculator },
  { id: "imobiliaria", label: "Imobiliária", termo: "imobiliária", icon: Home },
  { id: "construcao", label: "Construção", termo: "material de construção", icon: Hammer },
  { id: "fotografo", label: "Fotógrafo", termo: "fotógrafo", icon: Camera },
];

export function nichoPorId(id: string) {
  return NICHOS.find((n) => n.id === id);
}
