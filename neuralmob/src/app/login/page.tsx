import { redirect } from "next/navigation";

/** Legacy URL; Clerk sign-in lives at `/sign-in`. */
export default function LoginPage() {
  redirect("/sign-in");
}
