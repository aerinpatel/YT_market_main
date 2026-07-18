import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute>
      <div className="h-full w-full bg-black text-white flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
