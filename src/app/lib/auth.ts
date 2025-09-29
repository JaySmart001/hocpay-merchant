// src/app/lib/auth.ts
"use client";

const KEY = "hocpay_auth_v1";

export type Session = { email: string };

export function signInLocal(email: string, password: string): Session | null {
  // Demo credentials
  if (
    email.trim().toLowerCase() === "test@gmail.com" &&
    password === "123456"
  ) {
    const session = { email: email.trim().toLowerCase() };
    localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  }
  return null;
}

export function signOutLocal() {
  localStorage.removeItem(KEY);
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
