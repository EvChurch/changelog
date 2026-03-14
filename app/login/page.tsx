import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignIn from "./sign-in";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="changelog-card w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="changelog-page-title text-2xl">Changelog</h1>
          <p className="changelog-page-subtitle mt-2">
            Sign in with Planning Center Online
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
