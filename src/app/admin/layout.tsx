import { redirect } from "next/navigation";
import { getAuthUser, getOrCreateProfile, isAdminEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isUserAdmin(user: any): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  if (user.role === "ADMIN" || user.is_admin === true) return true;
  if (email === "support@kamaikaro.in" || email === "admin@kamaikaro.in") return true;
  return isAdminEmail(email);
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthUser();
  if (!auth) {
    redirect("/login?next=/admin");
  }

  const profile = await getOrCreateProfile(auth).catch(() => null);
  if (!profile || !isUserAdmin(profile)) {
    redirect("/reports");
  }

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-ink antialiased">
      {children}
    </div>
  );
}
