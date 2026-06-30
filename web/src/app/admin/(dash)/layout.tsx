import AdminShell from "@/components/AdminShell";

export default function AdminDashLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
