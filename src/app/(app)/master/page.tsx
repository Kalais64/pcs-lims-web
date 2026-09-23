import { redirect } from "next/navigation";

export default function MasterRedirectPage() {
  redirect("/admin");
}
