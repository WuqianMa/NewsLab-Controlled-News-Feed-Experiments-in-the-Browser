import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { isPublicDemoMode } from "@/lib/demoMode";

export const metadata: Metadata = {
  title: {
    default: "NewsLab Admin",
    template: "%s | NewsLab",
  },
  description: "Configure and monitor NewsLab research studies.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell publicDemo={isPublicDemoMode()}>{children}</AdminShell>;
}
