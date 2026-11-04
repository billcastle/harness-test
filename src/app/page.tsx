import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import PinForm from "./PinForm";
import ThemeToggle from "./ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (await isAuthed()) redirect("/tracker");
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="fixed top-4 right-4"><ThemeToggle /></div>
      <PinForm />
    </div>
  );
}
