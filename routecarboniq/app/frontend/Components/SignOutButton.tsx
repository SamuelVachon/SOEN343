"use client";

import { auth } from "../lib/firebaseClient";

export default function SignOutButton() {
  return (
    <button
      onClick={() => auth.signOut()}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-500 px-5 text-white transition-colors hover:bg-red-600 md:w-[158px]"
    >
      Sign Out
    </button>
  );
}
