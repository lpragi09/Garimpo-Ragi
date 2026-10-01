import type { Metadata } from "next";
import { Leads } from "./Leads";

export const metadata: Metadata = { title: "Meus leads · Garimpo" };

export default function LeadsPage() {
  return <Leads />;
}
