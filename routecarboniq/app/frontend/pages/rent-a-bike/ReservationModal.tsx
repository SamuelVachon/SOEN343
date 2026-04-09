import { Bike, CheckCircle2, Loader2, MapPinned } from "lucide-react";
import { useState } from "react";

export type ReservationStep =
  | "idle"
  | "form"
  | "processing"
  | "success"
  | "active"
  | "returning"
  | "completed";

interface StationOption {
  station_id: string;
  name: string;
}

interface CompletedRentalSummary {
  returnStationName: string;
  actualDurationMinutes: number;
  finalCharge: number;
  distanceKm?: number;
  carbonSaved?: number;
}

interface ReservationModalProps {
  reservationStep: ReservationStep;
  selectedStationName: string;
  stationOptions: StationOption[];
  rideElapsedSeconds: number;
  returnStationId: string;
  actualRideDurationMinutes: number;
  actualRideCost: number;
  processingMessage: string;
  errorMessage: string;
  completedRental: CompletedRentalSummary | null;
  onReturnStationChange: (value: string) => void;
  onConfirm: () => void;
  onReturn: () => void;
  onStartRide: () => void;
  onClose: () => void;
}

const SERVICE_FEE = 1.6;
const PRICE_PER_MINUTE = 0.21;

// --- Helpers ---
const formatCardNumber = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
};
const formatCVC = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function ReservationModal({
  reservationStep,
  selectedStationName,
  stationOptions,
  rideElapsedSeconds,
  returnStationId,
  actualRideDurationMinutes,
  actualRideCost,
  processingMessage,
  errorMessage,
  completedRental,
  onReturnStationChange,
  onConfirm,
  onReturn,
  onStartRide,
  onClose,
}: ReservationModalProps) {
  const [payment, setPayment] = useState({
    name: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const minutes = Math.floor(rideElapsedSeconds / 60);
  const seconds = rideElapsedSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isPaymentValid =
    payment.name.trim().length > 1 &&
    payment.cardNumber.replace(/\s/g, "").length === 16 &&
    payment.expiry.length === 5 &&
    payment.cvc.length >= 3;

  if (reservationStep === "idle") return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* STEP: FORM */}
        {reservationStep === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
                Confirm Reservation
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                Station: {selectedStationName}
              </p>
            </div>

            {errorMessage && <p style={styles.errorText}>{errorMessage}</p>}

            <div style={styles.priceCard}>
              <div style={styles.priceRow}>
                <span>Service Fee</span>
                <span>${SERVICE_FEE.toFixed(2)}</span>
              </div>
              <div style={{ ...styles.priceRow, margin: "4px 0" }}>
                <span>Usage Rate</span>
                <span>${PRICE_PER_MINUTE.toFixed(2)}/min</span>
              </div>
              <div style={styles.divider} />
              <div
                style={{
                  ...styles.priceRow,
                  fontWeight: 700,
                  color: "#000",
                  fontSize: 15,
                }}
              >
                <span>Billing</span>
                <span>Charged at return</span>
              </div>
            </div>

            <p style={styles.helperText}>
              Start the ride now and pay only after returning the bike based on
              actual ride duration.
            </p>

            <button onClick={onConfirm} style={styles.btnPrimary(true)}>
              Reserve Bike
            </button>
            <button onClick={onClose} style={styles.btnText}>
              Cancel
            </button>
          </div>
        )}

        {/* STEP: PROCESSING */}
        {reservationStep === "processing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Loader2
              size={40}
              className="animate-spin"
              style={{ margin: "0 auto", color: "#10b981" }}
            />
            <p style={{ marginTop: 16, fontWeight: 600 }}>
              {processingMessage}
            </p>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {reservationStep === "success" && (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2
              size={50}
              color="#10b981"
              style={{ margin: "0 auto" }}
            />
            <h3 style={{ fontWeight: 700, marginTop: 16, fontSize: 18 }}>
              Success!
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
              Your bike at <strong>{selectedStationName}</strong> is ready.
            </p>
            <button onClick={onStartRide} style={styles.btnClose}>
              Start Ride
            </button>
          </div>
        )}

        {/* STEP: ACTIVE */}
        {reservationStep === "active" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={styles.iconCircle}>
                <Bike size={26} color="#10b981" />
              </div>
            </div>

            <div>
              <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
                Ride in Progress
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                Started from {selectedStationName}
              </p>
            </div>

            <div style={styles.timerCard}>
              <div style={styles.timerLabel}>Ride Time</div>
              <div style={styles.timerValue}>{formattedTime}</div>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  margin: 0,
                }}
              >
                Your charge continues to update until you return the bike.
              </p>
            </div>

            <button onClick={onReturn} style={styles.btnPrimary(true)}>
              Return Bike
            </button>
          </div>
        )}

        {/* STEP: RETURNING */}
        {reservationStep === "returning" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
                Complete Return
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                Choose the station where the bike was returned.
              </p>
            </div>

            {errorMessage && <p style={styles.errorText}>{errorMessage}</p>}

            <div style={styles.infoBox}>
              <MapPinned size={18} color="#64748b" />
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Destination Station</label>
                <select
                  style={styles.selectField}
                  value={returnStationId}
                  onChange={(e) => onReturnStationChange(e.target.value)}
                >
                  <option value="">Select a station</option>
                  {stationOptions.map((station) => (
                    <option key={station.station_id} value={station.station_id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.priceCard}>
              <div style={styles.priceRow}>
                <span>Ride Duration</span>
                <span>{actualRideDurationMinutes} mins</span>
              </div>
              <div style={{ ...styles.priceRow, marginTop: 6 }}>
                <span>Service Fee</span>
                <span>${SERVICE_FEE.toFixed(2)}</span>
              </div>
              <div style={{ ...styles.priceRow, marginTop: 6 }}>
                <span>Usage</span>
                <span>
                  ${(actualRideDurationMinutes * PRICE_PER_MINUTE).toFixed(2)}
                </span>
              </div>
              <div style={styles.divider} />
              <div
                style={{
                  ...styles.priceRow,
                  fontWeight: 700,
                  color: "#000",
                  fontSize: 15,
                }}
              >
                <span>Total Due</span>
                <span>${actualRideCost.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <h4 style={styles.paymentTitle}>Payment Details</h4>
              <div style={styles.paymentGroup}>
                <input
                  style={{
                    ...styles.inputField,
                    borderBottom: "1px solid #e2e8f0",
                  }}
                  placeholder="Name"
                  value={payment.name}
                  onChange={(e) =>
                    setPayment({ ...payment, name: e.target.value })
                  }
                />
                <input
                  style={{
                    ...styles.inputField,
                    borderBottom: "1px solid #e2e8f0",
                  }}
                  placeholder="0000 0000 0000 0000"
                  value={payment.cardNumber}
                  onChange={(e) =>
                    setPayment({
                      ...payment,
                      cardNumber: formatCardNumber(e.target.value),
                    })
                  }
                />
                <div style={{ display: "flex" }}>
                  <input
                    style={{
                      ...styles.inputField,
                      width: "50%",
                      borderRight: "1px solid #e2e8f0",
                    }}
                    placeholder="MM/YY"
                    value={payment.expiry}
                    onChange={(e) =>
                      setPayment({
                        ...payment,
                        expiry: formatExpiry(e.target.value),
                      })
                    }
                  />
                  <input
                    style={{ ...styles.inputField, width: "50%" }}
                    placeholder="CVC"
                    value={payment.cvc}
                    onChange={(e) =>
                      setPayment({ ...payment, cvc: formatCVC(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            <button
              disabled={!returnStationId || !isPaymentValid}
              onClick={onReturn}
              style={styles.btnPrimary(
                Boolean(returnStationId && isPaymentValid),
              )}
            >
              Pay & Complete Return
            </button>
          </div>
        )}

        {/* STEP: COMPLETED */}
        {reservationStep === "completed" && completedRental && (
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <CheckCircle2
              size={50}
              color="#10b981"
              style={{ margin: "0 auto" }}
            />
            <div>
              <h3 style={{ fontWeight: 700, margin: 0, fontSize: 18 }}>
                Ride Completed
              </h3>
              <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                Returned at <strong>{completedRental.returnStationName}</strong>
              </p>
            </div>

            <div style={styles.priceCard}>
              <div style={styles.priceRow}>
                <span>Ride Duration</span>
                <span>{completedRental.actualDurationMinutes} mins</span>
              </div>
              {completedRental.distanceKm !== undefined && (
                <div style={{ ...styles.priceRow, marginTop: 6 }}>
                  <span>Distance Traveled</span>
                  <span>{completedRental.distanceKm.toFixed(2)} km</span>
                </div>
              )}
              {completedRental.carbonSaved !== undefined && (
                <div style={{ ...styles.priceRow, marginTop: 6 }}>
                  <span>CO2 Saved</span>
                  <span className="text-emerald-600" style={{ color: "#10b981", fontWeight: 600 }}>
                    {(completedRental.carbonSaved / 1000).toFixed(2)} kg
                  </span>
                </div>
              )}
              <div style={{ ...styles.priceRow, marginTop: 6 }}>
                <span>Paid</span>
                <span>${completedRental.finalCharge.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={onClose} style={styles.btnClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "rgba(15, 23, 42, 0.6)",
  },
  modal: {
    background: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  infoBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#f8fafc",
    padding: "12px 16px",
    borderRadius: "12px",
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    display: "block",
    textTransform: "uppercase" as const,
  },
  priceCard: {
    background: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #f1f5f9",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#64748b",
  },
  divider: {
    height: "1px",
    background: "#e2e8f0",
    margin: "8px 0",
  },
  paymentTitle: {
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 8,
    color: "#475569",
    marginTop: 0,
  },
  paymentGroup: {
    display: "flex",
    flexDirection: "column" as const,
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    overflow: "hidden" as const,
  },
  inputField: {
    width: "100%",
    padding: "10px 12px",
    border: "none",
    outline: "none",
    fontSize: "14px",
    background: "transparent",
  },
  selectField: {
    width: "100%",
    padding: "10px 0 4px",
    border: "none",
    outline: "none",
    fontSize: "14px",
    background: "transparent",
    color: "#1e293b",
  },
  timerCard: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 16,
    padding: 20,
  },
  timerLabel: {
    color: "#047857",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 42,
    lineHeight: 1,
    fontWeight: 800,
    color: "#065f46",
    marginBottom: 12,
  },
  iconCircle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
  },
  errorText: {
    margin: 0,
    color: "#dc2626",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
  },
  helperText: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  btnPrimary: (isActive: boolean) => ({
    background: isActive ? "#10b981" : "#94a3b8",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: 700,
    marginTop: 8,
    cursor: isActive ? "pointer" : "not-allowed",
  }),
  btnClose: {
    background: "#1e293b",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: 700,
    width: "100%",
    marginTop: 20,
    cursor: "pointer",
  },
  btnText: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
  },
};
