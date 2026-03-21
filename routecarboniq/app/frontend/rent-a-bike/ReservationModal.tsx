import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export type ReservationStep = "idle" | "form" | "processing" | "success";

interface ReservationModalProps {
  reservationStep: ReservationStep;
  selectedStationName: string;
  duration: number;
  onDurationChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const SERVICE_FEE = 1.60;
const PRICE_PER_MINUTE = 0.21;

// --- Helpers ---
const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
};
const formatCVC = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function ReservationModal({
  reservationStep, selectedStationName, duration, onDurationChange, onConfirm, onClose
}: ReservationModalProps) {
  const [payment, setPayment] = useState({ name: "", cardNumber: "", expiry: "", cvc: "" });

  useEffect(() => {
    if (reservationStep === "idle") setPayment({ name: "", cardNumber: "", expiry: "", cvc: "" });
  }, [reservationStep]);

  const isPaymentValid =
    payment.name.trim().length > 1 &&
    payment.cardNumber.replace(/\s/g, "").length === 16 &&
    payment.expiry.length === 5 &&
    payment.cvc.length >= 3;

  const canReserve = duration > 0 && isPaymentValid;
  const usageFee = duration * PRICE_PER_MINUTE;
  const totalFee = (SERVICE_FEE + usageFee).toFixed(2);

  if (reservationStep === "idle") return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* STEP: FORM */}
        {reservationStep === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>Confirm Reservation</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Station: {selectedStationName}</p>
            </div>

            <div style={styles.infoBox}>
              <Clock size={18} color="#64748b" />
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Ride Duration (Mins)</label>
                <input
                  type="number"
                  style={styles.durationInput}
                  value={duration === 0 ? "" : duration}
                  onChange={(e) => onDurationChange(e.target.value)}
                  placeholder="Enter minutes"
                />
              </div>
            </div>

            <div style={styles.priceCard}>
              <div style={styles.priceRow}><span>Service Fee</span><span>${SERVICE_FEE.toFixed(2)}</span></div>
              <div style={{ ...styles.priceRow, margin: "4px 0" }}>
                <span>Usage ${PRICE_PER_MINUTE.toFixed(2)}/min</span><span>${usageFee.toFixed(2)}</span>
              </div>
              <div style={styles.divider} />
              <div style={{ ...styles.priceRow, fontWeight: 700, color: "#000", fontSize: 15 }}>
                <span>Total</span><span>${totalFee}</span>
              </div>
            </div>

            <div>
              <h4 style={styles.paymentTitle}>Payment Details</h4>
              <div style={styles.paymentGroup}>
                <input
                  style={{ ...styles.inputField, borderBottom: "1px solid #e2e8f0" }}
                  placeholder="Name"
                  value={payment.name}
                  onChange={(e) => setPayment({ ...payment, name: e.target.value })}
                />
                <input
                  style={{ ...styles.inputField, borderBottom: "1px solid #e2e8f0" }}
                  placeholder="0000 0000 0000 0000"
                  value={payment.cardNumber}
                  onChange={(e) => setPayment({ ...payment, cardNumber: formatCardNumber(e.target.value) })}
                />
                <div style={{ display: "flex" }}>
                  <input
                    style={{ ...styles.inputField, width: "50%", borderRight: "1px solid #e2e8f0" }}
                    placeholder="MM/YY"
                    value={payment.expiry}
                    onChange={(e) => setPayment({ ...payment, expiry: formatExpiry(e.target.value) })}
                  />
                  <input
                    style={{ ...styles.inputField, width: "50%" }}
                    placeholder="CVC"
                    value={payment.cvc}
                    onChange={(e) => setPayment({ ...payment, cvc: formatCVC(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <button disabled={!canReserve} onClick={onConfirm} style={styles.btnPrimary(canReserve)}>Confirm & Pay</button>
            <button onClick={onClose} style={styles.btnText}>Cancel</button>
          </div>
        )}

        {/* STEP: PROCESSING */}
        {reservationStep === "processing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Loader2 size={40} className="animate-spin" style={{ margin: "0 auto", color: "#10b981" }} />
            <p style={{ marginTop: 16, fontWeight: 600 }}>Processing Payment...</p>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {reservationStep === "success" && (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2 size={50} color="#10b981" style={{ margin: "0 auto" }} />
            <h3 style={{ fontWeight: 700, marginTop: 16, fontSize: 18 }}>Success!</h3>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
              Your bike at <strong>{selectedStationName}</strong> is reserved for {duration} minutes.
            </p>
            <button onClick={onClose} style={styles.btnClose}>Close</button>
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
  durationInput: {
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: "16px",
    fontWeight: "600",
    width: "100%",
    color: "#1e293b",
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
  }
};