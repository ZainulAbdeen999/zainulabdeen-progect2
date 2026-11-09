import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (alive) setUser(data.user);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  }

  async function adminLogin(email, password) {
    const { data } = await api.post("/admin/login", { email, password });
    setUser(data.user);
    return data.user;
  }

  /*
   * Rider sign-in (added with the rider system).
   * Riders use a separate endpoint so their role can never be confused with a
   * customer or an admin session.
   */
  async function riderLogin(email, password) {
    const { data } = await api.post("/rider/login", { email, password });
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }

  async function refresh() {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      adminLogin,
      riderLogin,
      logout,
      refresh
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
