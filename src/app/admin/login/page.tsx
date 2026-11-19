import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { optionalAdminSession } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await optionalAdminSession()) redirect("/admin");
  return (
    <main className="adm adm-login" id="main">
      <LoginForm />
    </main>
  );
}
