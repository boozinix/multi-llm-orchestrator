import { redirect } from "next/navigation";

/** Legacy URL that forwards to the App Router Clerk sign-in page. */
export default function LoginPage() {
  redirect("/sign-in");
}
