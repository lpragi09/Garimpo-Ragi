import type { Metadata } from "next";
import { exigirLogin } from "@/lib/supabase/server";
import { Leads } from "./Leads";

export const metadata: Metadata = { title: "Meus leads · Garimpo" };

export default async function LeadsPage() {
  await exigirLogin();
  return <Leads />;
}
