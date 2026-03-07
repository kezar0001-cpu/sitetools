import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="brand-shell min-h-screen flex flex-col selection:bg-amber-200">
      <PublicNavbar />
      <main className="flex-grow flex flex-col overflow-hidden">{children}</main>
      <PublicFooter />
    </div>
  );
}
