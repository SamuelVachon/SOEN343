import { db } from "./firebaseClient";

const ADMINS_COLLECTION = "admins";

export function subscribeToAdminAccess(
  uid: string | null | undefined,
  callback: (isAdmin: boolean) => void,
) {
  if (!uid) {
    callback(false);
    return () => undefined;
  }

  return db
    .collection(ADMINS_COLLECTION)
    .doc(uid)
    .onSnapshot(
      (snapshot) => {
        callback(snapshot.exists);
      },
      (_error) => {
        // permission-denied means the user is not in the admins collection
        callback(false);
      },
    );
}
