import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile for the user name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();

  const userName =
    profile?.full_name || user.user_metadata?.full_name || user.email || "";

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Header userName={userName} />
        {children}
      </main>
    </div>
  );
}
