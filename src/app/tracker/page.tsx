import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getCategories, getCurrency } from "@/lib/settings";
import Tracker from "./Tracker";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await isAuthed())) redirect("/");
  return <Tracker initialCurrency={getCurrency()} initialCategories={await getCategories()} />;
}
