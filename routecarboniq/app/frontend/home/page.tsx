"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../src/context/AuthContext";
import Link from "next/link";
import SignOutButton from "../Components/SignOutButton";
import { Bike, Bus, CarFront, ChartLine, MoveRight, Leaf } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );
  if (!user) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-6 font-sans">

      {/* Animated Background */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-200/20 blur-[100px] animate-pulse" />
      <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-blue-100/20 blur-[100px] animate-pulse [animation-delay:2s]" />
      <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-lime-100/20 blur-[100px] animate-pulse [animation-delay:4s]" />

      {/* Top Navigation Bar */}
      <nav className="relative z-20 mx-auto max-w-6xl py-6">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-lg shadow-emerald-200/50">
              <Leaf size={16} fill="currentColor" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
              Route<span className="text-emerald-500/80">Carbon</span>IQ
            </p>
          </div>

          <div className="scale-85 transition-transform hover:scale-90 origin-right">
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto flex h-[calc(100vh-100px)] max-w-6xl flex-col justify-center pb-8">

        {/* Header Section */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl">
            Hello, <span className="text-emerald-500/90">{user.displayName}</span>
          </h1>
          <p className="mt-3 text-lg font-medium text-slate-400">
            Navigate Montreal’s transit ecosystem seamlessly.
          </p>
        </header>

        {/* Action Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* BIXI Container */}
          <Link href="/frontend/rent-a-bike" className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-8 shadow-xl shadow-slate-300/50 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/90">
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400 text-white shadow-lg shadow-rose-100 group-hover:scale-110 transition-transform">
                <Bike size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">BIXI</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">Rent a bike and track available stations.</p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-rose-400 uppercase tracking-wider">
              Rent Now <MoveRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* STM Container */}
          <Link href="/" className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-8 shadow-xl shadow-slate-300/50 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/90">
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400 text-white shadow-lg shadow-sky-100 group-hover:scale-110 transition-transform">
                <Bus size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">STM</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">Live bus and metro schedules.</p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-sky-400 uppercase tracking-wider">
              Schedules <MoveRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Parking Container */}
          <Link href="/" className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-8 shadow-xl shadow-slate-300/50 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/90">
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-700 text-white shadow-lg shadow-slate-100 group-hover:scale-110 transition-transform">
                <CarFront size={22} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Parking</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">Locate available city parking spots.</p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-slate-600 uppercase tracking-wider">
              Find Space <MoveRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Analytics Container */}
          <Link href="/frontend/dashboard" className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-8 shadow-xl shadow-slate-300/50 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/90">
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-white shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                <ChartLine size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Analytics</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">Explore trends in transit usage and carbon impact.</p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-emerald-500 uppercase tracking-wider">
              Insights <MoveRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

        </div>
      </main>
    </div>
  );
}