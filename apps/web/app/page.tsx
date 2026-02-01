import { redirect } from "next/navigation";
import { authGuardOptional } from "@/lib/server-auth-guard";

export default async function HomePage() {
  // Check if user has a session
  const user = await authGuardOptional();

  if (user) {
    // Authenticated - redirect to dashboard
    redirect("/dashboard");
  } else {
    // Not authenticated - redirect to login
    redirect("/auth/login");
  }
}
