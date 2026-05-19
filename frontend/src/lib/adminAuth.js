// Admin session — stored in localStorage, mirrors the citizen/employee
// helpers. The admin payload only needs identity fields (no branch/employee
// lookup), so there's no API refresh step.

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "gov.admin.session";

export function getAdminSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAdminSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function useAdminSession({ requireAuth = true } = {}) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existing = getAdminSession();
    if (!existing?._id) {
      setLoading(false);
      if (requireAuth) {
        navigate("/auth/login", { replace: true });
      }
      return;
    }
    setSession(existing);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
    setSession(null);
    navigate("/auth/login", { replace: true });
  }, [navigate]);

  return { session, loading, logout };
}
