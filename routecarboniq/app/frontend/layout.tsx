"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  Bus,
  CarFront,
  ChartLine,
  ChevronsLeft,
  ChevronsRight,
  Leaf,
} from "lucide-react";

const navItems = [
  {
    label: "Bixi",
    href: "/frontend/pages/rent-a-bike",
    icon: Bike,
    iconClass: "bg-rose-400 text-white shadow-lg shadow-rose-100",
  },
  {
    label: "STM",
    href: "/frontend/pages/stm",
    icon: Bus,
    iconClass: "bg-sky-400 text-white shadow-lg shadow-sky-100",
  },
  {
    label: "Parking",
    href: "/frontend/pages/parking",
    icon: CarFront,
    iconClass: "bg-slate-700 text-white shadow-lg shadow-slate-100",
  },
  {
    label: "Analytics",
    href: "/frontend/pages/dashboard",
    icon: ChartLine,
    iconClass: "bg-emerald-400 text-white shadow-lg shadow-emerald-100",
  },
];

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  if (pathname === "/frontend/login" || pathname === "/frontend/pages/home") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-white p-4 pt-5 transition-[width] duration-200",
          isSidebarExpanded ? "w-64" : "w-20",
        ].join(" ")}
      >
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link
            href="/frontend/pages/home"
            className="flex items-center gap-2"
            title="Go to home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-lg shadow-emerald-200/50">
              <Leaf size={16} fill="currentColor" />
            </div>
            {isSidebarExpanded && (
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                Route<span className="text-emerald-500/80">Carbon</span>IQ
              </p>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsSidebarExpanded((expanded) => !expanded)}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-emerald-200 bg-linear-to-br from-emerald-500 to-emerald-600 px-3 text-white shadow-md shadow-emerald-200/70 transition-all hover:scale-105 hover:from-emerald-400 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarExpanded ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={[
                  "flex items-center rounded-xl px-3 py-2 text-sm font-semibold transition",
                  isSidebarExpanded ? "gap-3" : "justify-center",
                  isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-2xl",
                    item.iconClass,
                  ].join(" ")}
                >
                  <Icon size={16} />
                </span>
                {isSidebarExpanded && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main
        className={[
          "min-h-screen transition-[margin] duration-200",
          isSidebarExpanded ? "md:ml-64" : "md:ml-20",
        ].join(" ")}
      >
        {children}
      </main>
    </div>
  );
}
