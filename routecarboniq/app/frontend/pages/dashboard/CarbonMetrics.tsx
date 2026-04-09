import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Leaf, TrendingDown } from "lucide-react";
import { getFirestore, doc, getDoc } from "firebase/firestore";

interface CarbonMetricsProps {
  isAdmin?: boolean;
}

export function CarbonMetrics({ isAdmin = false }: CarbonMetricsProps) {
  const { user } = useAuth();
  const [carbonSaved, setCarbonSaved] = useState<number>(0);
  const [carbonEmitted, setCarbonEmitted] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchCarbonMetrics() {
      try {
        const db = getFirestore();
        const userAnalyticsRef = doc(db, "user_analytics", user!.uid);
        const docSnap = await getDoc(userAnalyticsRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCarbonSaved(data.totalCarbonSaved || 0);
          setCarbonEmitted(data.totalCarbonEmitted || 0);
        }
      } catch (error) {
        console.error("Failed to fetch carbon metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCarbonMetrics();
    
    // Auto-refresh every 5 seconds to catch updates from rentals/navigation
    const interval = setInterval(fetchCarbonMetrics, 5000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="animate-pulse flex gap-4">
        <div className="flex-1 h-24 bg-slate-200 rounded-3xl"></div>
        <div className="flex-1 h-24 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-5 rounded-3xl border border-slate-100 shadow-sm bg-emerald-50 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-600">CO2 Saved</p>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <Leaf className="h-6 w-6 text-emerald-500" />
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
          {(carbonSaved / 1000).toFixed(2)} kg
        </p>
        <p className="text-xs text-slate-500 mt-2">Total carbon offset by eco-friendly choices</p>
      </div>

      <div className="p-5 rounded-3xl border border-slate-100 shadow-sm bg-red-50 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-600">CO2 Emitted</p>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <TrendingDown className="h-6 w-6 text-red-500" />
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
          {(carbonEmitted / 1000).toFixed(2)} kg
        </p>
        <p className="text-xs text-slate-500 mt-2">Total carbon from your trips</p>
      </div>
    </div>
  );
}

export function GlobalCarbonMetrics() {
  const [totalCarbonSaved, setTotalCarbonSaved] = useState<number>(0);
  const [totalCarbonEmitted, setTotalCarbonEmitted] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGlobalMetrics() {
      try {
        const response = await fetch("/api/analytics/emissions");
        const data = await response.json();
        setTotalCarbonSaved(data.totalCarbonSaved || 0);
        setTotalCarbonEmitted(data.totalCarbonEmitted || 0);
      } catch (error) {
        console.error("Failed to fetch global carbon metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchGlobalMetrics();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchGlobalMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse flex gap-4">
        <div className="flex-1 h-24 bg-slate-200 rounded-3xl"></div>
        <div className="flex-1 h-24 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-5 rounded-3xl border border-slate-100 shadow-sm bg-emerald-50 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-600">Global CO2 Saved</p>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <Leaf className="h-6 w-6 text-emerald-500" />
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
          {(totalCarbonSaved / 1000).toFixed(2)} kg
        </p>
        <p className="text-xs text-slate-500 mt-2">Combined community impact</p>
      </div>

      <div className="p-5 rounded-3xl border border-slate-100 shadow-sm bg-red-50 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-600">Global CO2 Emitted</p>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <TrendingDown className="h-6 w-6 text-red-500" />
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
          {(totalCarbonEmitted / 1000).toFixed(2)} kg
        </p>
        <p className="text-xs text-slate-500 mt-2">Total emissions tracked</p>
      </div>
    </div>
  );
}
