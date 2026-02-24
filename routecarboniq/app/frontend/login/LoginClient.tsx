"use client";

import dynamic from "next/dynamic";

const FirebaseAuthUI = dynamic(() => import("../Components/FirebaseAuthUI"), {
  ssr: false,
});

export default function LoginClient() {
  return <FirebaseAuthUI />;
}
