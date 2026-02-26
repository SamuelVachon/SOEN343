"use client";

import dynamic from "next/dynamic";
import { Leaf } from "lucide-react";

const FirebaseAuthUI = dynamic(
  () => import("./frontend/Components/FirebaseAuthUI"),
  {
    ssr: false,
  },
);

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 font-sans">

      {/* Animated Background */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-200/20 blur-[100px] animate-pulse" />
      <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-blue-100/20 blur-[100px] animate-pulse [animation-delay:2s]" />
      <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-lime-100/20 blur-[100px] animate-pulse [animation-delay:4s]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center justify-center">

        <section className="w-full rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-10 shadow-xl shadow-slate-300/50 backdrop-blur-2xl transition-all">

          <header className="mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-lg shadow-emerald-200/50">
                <Leaf size={16} fill="currentColor" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                Route<span className="text-emerald-500/80">Carbon</span>IQ
              </p>
            </div>

            <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-800">
              Welcome
            </h1>
            <p className="mt-3 text-base font-medium text-slate-400 leading-relaxed">
              Sign in with your preferred account method.
            </p>
          </header>

          <div className="mt-10 min-h-50">
            <FirebaseAuthUI />
          </div>
        </section>
      </main>
    </div>
  );
}