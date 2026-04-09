"use client";

import { useState } from "react";
import { auth } from "./frontend/lib/firebaseClient";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Leaf, Mail, Lock } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const FirebaseAuthUI = dynamic(
  () => import("./frontend/Components/FirebaseAuthUI"),
  { ssr: false },
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.SubmitEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/frontend/pages/home");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 font-sans">
      {/* Animated Background */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-200/20 blur-[100px] animate-pulse" />
      <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-blue-100/20 blur-[100px] animate-pulse [animation-delay:2s]" />
      <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-lime-100/20 blur-[100px] animate-pulse [animation-delay:4s]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center justify-center">
        <section className="w-full rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-10 shadow-xl shadow-slate-300/50 backdrop-blur-2xl">
          <header className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-lg shadow-emerald-200/50">
                <Leaf size={16} fill="currentColor" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                Route<span className="text-emerald-500/80">Carbon</span>IQ
              </p>
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-800">
              Welcome
            </h1>
          </header>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white/50 py-4 pl-12 pr-4 outline-none focus:border-emerald-500 transition-colors"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white/50 py-4 pl-12 pr-4 outline-none focus:border-emerald-500 transition-colors"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white transition-transform hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              Login
            </button>
          </form>

          <div className="relative my-5 text-center text-sm">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <span className="relative bg-white/70 px-4 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
              Or
            </span>
          </div>

          <FirebaseAuthUI />

          <p className="mt-8 text-center text-sm font-medium text-slate-400">
            New to the platform?{" "}
            <Link href="/register" className="text-emerald-600 hover:underline">
              Create Account
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
