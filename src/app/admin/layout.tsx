import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { UploadProvider } from "@/components/admin/upload-manager";
import { requireStaffPage } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  const [studio, unread] = await Promise.all([db.studio.findUnique({ where: { id: user.studioId } }), db.notification.count({ where: { userId: user.id, readAt: null } })]);
  return (
    <UploadProvider>
      <AdminShell user={user} studioName={studio?.name ?? ""} unread={unread}>
        {children}
      </AdminShell>
    </UploadProvider>
  );
}
