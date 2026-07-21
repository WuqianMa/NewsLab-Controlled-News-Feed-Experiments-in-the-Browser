"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DemoModeProvider } from "@/components/admin/DemoMode";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/experiments", label: "Experiments" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/generate", label: "Generate" },
  { href: "/admin/participants", label: "Participants" },
  { href: "/admin/export", label: "Export" },
];

export function AdminShell({
  children,
  publicDemo,
}: {
  children: React.ReactNode;
  publicDemo: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (pathname === "/admin/login") {
    return <DemoModeProvider enabled={publicDemo}>{children}</DemoModeProvider>;
  }

  return (
    <DemoModeProvider enabled={publicDemo}>
      <div className="min-h-dvh bg-gray-100">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <span className="text-sm font-bold">NewsLab admin</span>
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          aria-controls="admin-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id="admin-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-52 flex-col bg-gray-900 text-gray-300 transition-transform md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 text-sm font-bold text-white">
          <span>
            NewsLab <span className="font-normal text-gray-400">admin</span>
          </span>
          <button
            type="button"
            className="rounded px-2 py-1 text-gray-300 hover:bg-gray-800 md:hidden"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            X
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2" aria-label="Admin navigation">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-gray-700 font-medium text-white"
                    : "hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {signOutError && (
          <p className="mx-4 mb-2 text-xs text-red-300" role="alert">
            Sign out failed. Try again.
          </p>
        )}
        <button
          type="button"
          disabled={signingOut}
          className="m-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-800 disabled:opacity-50"
          onClick={async () => {
            setSigningOut(true);
            setSignOutError(false);
            try {
              const response = await fetch("/api/admin/auth/logout", {
                method: "POST",
              });
              if (!response.ok) throw new Error();
              router.push("/admin/login");
              router.refresh();
            } catch {
              setSignOutError(true);
              setSigningOut(false);
            }
          }}
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </aside>

        <main className="min-w-0 overflow-x-hidden p-4 md:ml-52 md:p-6">
          {publicDemo && (
            <div
              className="mb-4 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              <strong>Read-only public demo.</strong> Browse and preview freely. Save,
              create, generate, import, and delete requests are blocked by the server.
            </div>
          )}
          {children}
        </main>
      </div>
    </DemoModeProvider>
  );
}
