"use client";

import { auth } from "../lib/firebaseClient";
import { AnalyticsService } from "../services/AnalyticsService";

export default function SignOutButton() {
  const handleSignOut = async () => {
    if (auth.currentUser) {
      const loginTimeStr = sessionStorage.getItem("loginTime");
      const loginTimeMs = loginTimeStr ? parseInt(loginTimeStr, 10) : Date.now();
      
      // We only care about the remainder seconds since the last 60-second interval ran
      const totalSessionMs = Date.now() - loginTimeMs;
      const remainderSeconds = Math.floor((totalSessionMs % 60000) / 1000);

      if (remainderSeconds > 0) {
        AnalyticsService.getInstance().trackEvent("SESSION_ENDED", { 
          userId: auth.currentUser.uid,
          durationInSeconds: remainderSeconds
        });
      }
    }
    await auth.signOut();
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-500 px-5 text-white transition-colors hover:bg-red-600 md:w-[158px]"
    >
      Sign Out
    </button>
  );
}
