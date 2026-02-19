require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const admin = require("firebase-admin");
const path = require("path");

// ── Firebase Admin Init ───────────────────────────────────────────────────────
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ── Middleware: verify Firebase ID token ──────────────────────────────────────
async function verifyToken(req, res, next) {
  const idToken = req.headers.authorization?.split("Bearer ")[1]
    || req.cookies?.session;

  if (!idToken) {
    return res.status(401).json({ error: "Unauthorized — no token provided" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Only allow Google-provider accounts (Google Sign-In OR Gmail email/password)
    const isGoogleProvider = decoded.firebase?.sign_in_provider === "google.com"
      || decoded.firebase?.sign_in_provider === "password";

    const isGmailAddress = /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(decoded.email || "");

    if (!isGoogleProvider || !isGmailAddress) {
      return res.status(403).json({ error: "Only Google/Gmail accounts are allowed." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /auth/verify — called by frontend after login to set a session cookie
app.post("/auth/verify", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "Missing idToken" });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const isGmailAddress = /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(decoded.email || "");
    if (!isGmailAddress) {
      return res.status(403).json({ error: "Only Google/Gmail accounts are allowed." });
    }

    // Optional: set a short-lived session cookie (1 hour)
    res.cookie("session", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.json({ message: "Authenticated", user: { uid: decoded.uid, email: decoded.email, name: decoded.name } });
  } catch (err) {
    res.status(401).json({ error: "Token verification failed" });
  }
});

// POST /auth/logout — clears the session cookie
app.post("/auth/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ message: "Logged out" });
});

// GET /api/profile — example protected route
app.get("/api/profile", verifyToken, (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email,
    name: req.user.name || req.user.email,
    picture: req.user.picture || null,
  });
});

// Serve frontend for all other routes (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start App ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Application running at http://localhost:${PORT}`);
});
