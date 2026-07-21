import type { Metadata } from "next";
import { ParticipantSessionGuard } from "@/components/feed/ParticipantSessionGuard";

export const metadata: Metadata = {
  title: "Nuze",
  description: "Your stories, all in one place.",
};

// Minimal participant shell — no admin chrome, no experiment vocabulary.
export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-gray-100">
      <ParticipantSessionGuard />
      {children}
    </div>
  );
}
