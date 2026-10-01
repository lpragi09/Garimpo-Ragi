import { exigirLogin } from "@/lib/supabase/server";
import { Garimpar } from "./Garimpar";

export default async function Home() {
  await exigirLogin();
  return <Garimpar />;
}
