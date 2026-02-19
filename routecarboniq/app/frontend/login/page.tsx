"use client";

import dynamic from "next/dynamic";

const FirebaseAuthUI = dynamic(() => import("../Components/FirebaseAuthUI"), {
  ssr: false,
});

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Sign in</h1>
      <FirebaseAuthUI />
    </main>
  );
}
