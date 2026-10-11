"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { name: "Analyze", href: "/" },
    { name: "Scan Report", href: "/scan" },
    { name: "History", href: "/history" },
    { name: "Settings", href: "/settings" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 font-bold text-white shadow-lg shadow-violet-500/20">
            AI
          </div>

          <div>
            <h1 className="font-semibold tracking-tight text-white">
              AI Code Review
            </h1>
            <p className="text-xs text-zinc-500">
              Repository intelligence
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <span className="ml-2 hidden max-w-40 truncate text-xs text-zinc-500 lg:inline">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <button
            type="button"
            onClick={() =>
              void (session
                ? signOut({ callbackUrl: "/" })
                : signIn("github", { callbackUrl: "/" }))
            }
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
          >
            {session ? "Sign out" : "Sign in"}
          </button>
        </div>
      </div>
    </nav>
  );
}