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
        // add more providers if you want
      ],
      signInFlow: "popup", // "redirect" also works
      callbacks: {
        // Return false to avoid full-page redirect handled by FirebaseUI
        signInSuccessWithAuthResult: () => {
          window.location.assign("/frontend/pages/home");
          return false;
        },
      },
    });

    return () => {
      uiRef.current?.reset();
    };
  }, []);

  return (
    <>
      <div id="firebaseui-auth-container" />
      <style jsx global>{`
        #firebaseui-auth-container .firebaseui-idp-button,
        #firebaseui-auth-container .firebaseui-tenant-button {
          width: 100%;
          max-width: none;
          min-height: 56px;
          border-radius: 1rem;
          box-shadow: none;
          border: 1px solid rgb(226 232 240);
        }
      `}</style>
    </>
  );
}
