import { Suspense } from "react";
import { AuthCallback } from "@/components/auth/sign-in";

export const metadata = { title: "Signing in" };

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
