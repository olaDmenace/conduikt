// Shared flag so SessionGuard's onAuthStateChange(SIGNED_OUT) handler
// doesn't race with an intentional logout and fire a duplicate redirect
// or the wrong "session expired" toast.
let signingOut = false;

export function markSigningOut() {
  signingOut = true;
}

export function isSigningOut() {
  return signingOut;
}
