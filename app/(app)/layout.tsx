import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex bg-slate-50 min-h-screen text-slate-900 selection:bg-amber-200">
            <AppSidebar />
            <div className="flex flex-col flex-1 md:ml-64 relative min-w-0 h-screen overflow-hidden">
                <AppTopbar />
                <main className="flex-1 overflow-y-auto hidden-scrollbar bg-slate-50/50 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
