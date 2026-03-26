"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { subscribeToAdminAccess } from "../../lib/adminAccess";
import { AnalyticsService } from "../../services/AnalyticsService";
import {
  Activity,
  Bike,
  Clock,
  Coins,
  Globe2,
  LineChart,
  MonitorSmartphone,
  ServerCrash
} from "lucide-react";

interface UserMetrics {
  totalRides: number;
  totalRideTime: number;
  screenTime: number;
  totalMoneySpent: number;
}

interface AdminMetrics {
  totalRides: number;
  totalRevenue: number;
  averageRideDuration: number;
  apiResponseTimeAverage: number;
  apiEndpointAverages?: Record<string, number>;
  dailyActiveUsers: any[];
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminViewMode, setAdminViewMode] = useState<"admin" | "user">("admin");
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [fetching, setFetching] = useState(true);

  // Auth and redirect
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/frontend/login");
    }
  }, [loading, user, router]);

  // Admin and Metrics Subscription
  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;

    const unsubscribeAdmin = subscribeToAdminAccess(user.uid, (adminStatus) => {
      if (isSubscribed) setIsAdmin(adminStatus);
    });

    async function loadMetrics() {
      try {
        const [usrData, adminData] = await Promise.all([
          AnalyticsService.getInstance().getUserMetrics(user!.uid),
          AnalyticsService.getInstance().getGlobalMetrics() // Still fetches from /api/analytics/metrics/global
        ]);
        
        if (isSubscribed) {
          setUserMetrics(usrData);
          setAdminMetrics(adminData);
        }
      } catch (error) {
        console.error("Failed to load metrics", error);
      } finally {
        if (isSubscribed) setFetching(false);
      }
    }
    
    if (!loading) {
      loadMetrics();
    }

    return () => {
      isSubscribed = false;
      unsubscribeAdmin();
    };
  }, [user, loading]);

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col bg-slate-50 px-4 sm:px-6 font-sans">
      {/* Animated Background Details */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-200/20 blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-blue-100/20 blur-[100px] animate-pulse [animation-delay:2s] pointer-events-none" />

      <main className="relative z-10 flex flex-col justify-center flex-1 mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col items-center justify-center text-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200">
            <LineChart size={28} />
          </div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-slate-800">
              {isAdmin 
                ? (adminViewMode === "admin" ? "Admin Platform Analytics" : "Your Carbon Dashboard (Admin)") 
                : "Your Carbon Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin && adminViewMode === "admin"
                ? "Overview of system-wide usage, active users, and revenue" 
                : "Track your personal carbon footprint, rides, and usage stats"}
            </p>
          </div>

          {/* Admin Toggle Switch */}
          {isAdmin && (
            <div className="flex bg-slate-200/50 p-1 rounded-xl w-60 max-w-full shadow-inner border border-slate-200">
              <button
                onClick={() => setAdminViewMode("admin")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  adminViewMode === "admin"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Admin Stats
              </button>
              <button
                onClick={() => setAdminViewMode("user")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  adminViewMode === "user"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                My Stats
              </button>
            </div>
          )}
        </div>

        {!isAdmin || adminViewMode === "user" ? (
          /* User Stats Section */
          <section className="w-full max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard 
                title="Total Rides" 
                value={userMetrics?.totalRides || 0} 
                icon={<Bike className="h-6 w-6 text-emerald-500" />} 
                bgColor="bg-emerald-50"
              />
              <MetricCard 
                title="Total Ride Time" 
                value={`${userMetrics?.totalRideTime || 0} min`} 
                icon={<Clock className="h-6 w-6 text-blue-500" />} 
                bgColor="bg-blue-50"
              />
              <MetricCard 
                title="Money Spent" 
                value={`$${(userMetrics?.totalMoneySpent || 0).toFixed(2)}`} 
                icon={<Coins className="h-6 w-6 text-amber-500" />} 
                bgColor="bg-amber-50"
              />
              <MetricCard 
                title="Screen Time" 
                value={`${Math.round((userMetrics?.screenTime || 0) / 60)} min`} 
                icon={<MonitorSmartphone className="h-6 w-6 text-purple-500" />} 
                bgColor="bg-purple-50"
              />
            </div>
          </section>
        ) : (
          /* Admin Stats Section */
          <section className="w-full max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard 
                title="System Rides" 
                value={adminMetrics?.totalRides || 0} 
                icon={<Bike className="h-6 w-6 text-emerald-600" />} 
                bgColor="bg-emerald-50"
              />
              <MetricCard 
                title="Avg System Ride" 
                value={`${adminMetrics?.averageRideDuration || 0} min`} 
                icon={<Clock className="h-6 w-6 text-slate-500" />} 
                bgColor="bg-slate-100"
                details="The average duration of all completed bike rides taken by all users across the platform."
              />
              <MetricCard 
                title="Active Users" 
                value={adminMetrics?.dailyActiveUsers?.length || 0} 
                icon={<Activity className="h-6 w-6 text-rose-500" />} 
                bgColor="bg-rose-50"
              />
              <MetricCard 
                title="API Response Time" 
                value={`${adminMetrics?.apiResponseTimeAverage || 0} ms`} 
                icon={<ServerCrash className="h-6 w-6 text-slate-400" />} 
                bgColor="bg-gray-100"
                details="The overall average amount of time (in milliseconds) for all tracked frontend and backend operations."
                extraDetails={
                  adminMetrics?.apiEndpointAverages && Object.keys(adminMetrics.apiEndpointAverages).length > 0
                    ? Object.entries(adminMetrics.apiEndpointAverages).map(([endpoint, time]) => (
                        <div key={endpoint} className="flex justify-between items-center border-t border-slate-600 pt-1 mt-1">
                          <span className="truncate pr-2 text-[10px] text-slate-300 uppercase tracking-wider">{
                            endpoint
                          }</span>
                          <span className="font-mono text-emerald-400 font-bold text-xs">{time}ms</span>
                        </div>
                      ))
                    : <div className="border-t border-slate-600 pt-1 mt-1 text-slate-400 italic">No breakdown data yet. Perform some actions!</div>
                }
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// Reusable UI Component for Metrics
function MetricCard({ title, value, icon, bgColor = "bg-white", details, extraDetails }: { title: string, value: string | number, icon: React.ReactNode, bgColor?: string, details?: string, extraDetails?: React.ReactNode }) {
  const [showDetails, setShowDetails] = useState(false);
  const isClickable = Boolean(details || extraDetails);

  return (
    <div 
      onClick={() => isClickable && setShowDetails(!showDetails)}
      className={`relative p-5 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 ${bgColor} ${isClickable ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <div className="relative">
          <button 
            type="button"
            className={`rounded-xl bg-white p-2.5 shadow-sm transition-all ${isClickable ? "hover:ring-2 hover:ring-emerald-200" : "cursor-default"}`}
            title={isClickable ? "Click to toggle details" : ""}
          >
            {icon}
          </button>
          
          {/* Details Popup */}
          {showDetails && isClickable && (
            <div className="absolute right-0 bottom-[calc(100%+0.5rem)] z-50 w-64 p-4 rounded-xl bg-slate-800 text-white text-xs shadow-xl text-left cursor-default" onClick={(e) => e.stopPropagation()}>
              {details && <div className="mb-2 text-slate-300">{details}</div>}
              {extraDetails && <div className="mt-2 flex flex-col gap-1">{extraDetails}</div>}
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-slate-800 rotate-45 rounded-sm"></div>
            </div>
          )}
        </div>
      </div>
      <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">{value}</p>

      {/* Invisible overlay to click-away and close details */}
      {showDetails && (
        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowDetails(false); }}></div>
      )}
    </div>
  );
}
