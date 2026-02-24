"use client";

import dynamic from "next/dynamic";

const FirebaseAuthUI = dynamic(
  () => import("./frontend/Components/FirebaseAuthUI"),
  {
    ssr: false,
  },
);

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-100  to-emerald-200 px-4 py-10">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <section className="w-full rounded-2xl border border-white/50 bg-white p-8 shadow-lg shadow-emerald-900/10 ring-1 ring-white/40 backdrop-blur-xl backdrop-saturate-150">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
            RouteCarbonIQ
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">
            Welcome!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your preferred account method.
          </p>
          <div className="mt-6">
            <FirebaseAuthUI />
          </div>
        </section>
      </main>
    </div>
  );
}
