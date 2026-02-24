"use client";

import { useEffect, useRef } from "react";
import "firebaseui/dist/firebaseui.css";

import firebase, { auth } from "../lib/firebaseClient";
import * as firebaseui from "firebaseui";

export default function FirebaseAuthUI() {
  const uiRef = useRef<firebaseui.auth.AuthUI | null>(null);

  useEffect(() => {
    // Reuse the instance if it already exists
    uiRef.current =
      firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

    uiRef.current.start("#firebaseui-auth-container", {
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
        firebase.auth.PhoneAuthProvider.PROVIDER_ID,
        // add more providers if you want
      ],
      signInFlow: "popup", // "redirect" also works
      callbacks: {
        // Return false to avoid full-page redirect handled by FirebaseUI
        signInSuccessWithAuthResult: () => {
          window.location.assign("/frontend/home");
          return false;
        },
      },
    });

    return () => {
      uiRef.current?.reset();
    };
  }, []);

  return <div id="firebaseui-auth-container" />;
}
