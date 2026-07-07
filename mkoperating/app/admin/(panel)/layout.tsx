import type { Metadata } from 'next';
import { AdminBottomNav, AdminSidebar } from '@/components/admin/AdminNav';

export const metadata: Metadata = {
  title: 'Command center',
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper">
      <AdminSidebar />
      <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>
      <AdminBottomNav />
    </div>
  );
}
