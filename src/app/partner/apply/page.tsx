import { redirect } from "next/navigation";

/** Legacy route — partner intake now lives on the dashboard. */
export default function PartnerApplyRedirectPage() {
  redirect("/partner/dashboard");
}
