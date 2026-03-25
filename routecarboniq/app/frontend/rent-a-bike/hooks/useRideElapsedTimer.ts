import { useEffect, useState } from "react";
import { timestampToMillis, type RentalRecord } from "../services/rentalFlow";

export function useRideElapsedTimer(activeRental: RentalRecord | null) {
  const [rideElapsedSeconds, setRideElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeRental) {
      setRideElapsedSeconds(0);
      return;
    }

    const syncElapsedTime = () => {
      const startedAt = timestampToMillis(activeRental.startedAt);
      if (!startedAt) {
        setRideElapsedSeconds(0);
        return;
      }

      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setRideElapsedSeconds(elapsed);
    };

    syncElapsedTime();
    const interval = window.setInterval(syncElapsedTime, 1000);
    return () => window.clearInterval(interval);
  }, [activeRental]);

  return rideElapsedSeconds;
}
