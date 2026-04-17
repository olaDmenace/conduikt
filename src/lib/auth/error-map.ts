const INVALID_CREDENTIALS = /invalid login credentials|invalid email or password|invalid_credentials/i;
const USER_ALREADY_REGISTERED = /user already registered|already been registered|duplicate key/i;
const EMAIL_NOT_CONFIRMED = /email not confirmed/i;
const RATE_LIMITED = /rate limit|too many requests/i;
const WEAK_PASSWORD = /password should be at least|weak.password/i;

export function mapSupabaseAuthError(message: string | undefined | null): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Something went wrong. Please try again.";

  if (INVALID_CREDENTIALS.test(raw)) {
    return "We couldn't sign you in with those details. Try again or reset your password.";
  }
  if (EMAIL_NOT_CONFIRMED.test(raw)) {
    return "Your email hasn't been confirmed yet. Check your inbox for the verification link.";
  }
  if (USER_ALREADY_REGISTERED.test(raw)) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (RATE_LIMITED.test(raw)) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (WEAK_PASSWORD.test(raw)) {
    return "Password must be at least 8 characters.";
  }

  return raw;
}

export function isEmailNotConfirmedError(message: string | undefined | null): boolean {
  return EMAIL_NOT_CONFIRMED.test(message ?? "");
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginFieldErrors {
  email?: string;
  password?: string;
}

export interface SignupFieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

export function validateLoginFields(values: { email: string; password: string }): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  if (!values.email.trim()) {
    errors.email = "Please enter your email.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  if (!values.password) {
    errors.password = "Please enter your password.";
  }
  return errors;
}

export function validateSignupFields(values: {
  fullName: string;
  email: string;
  password: string;
}): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  if (!values.fullName.trim()) {
    errors.fullName = "Please enter your full name.";
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  }
  if (!values.email.trim()) {
    errors.email = "Please enter your email.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  if (!values.password) {
    errors.password = "Please enter a password.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  return errors;
}

export function hasErrors<T extends object>(errors: T): boolean {
  return Object.values(errors).some((v) => !!v);
}
