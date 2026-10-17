import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User, UserContext } from "@/lib/types";

interface MeResponse {
  user: User | null;
  context: UserContext | null;
}

interface AuthValue {
  user: User | null;
  context: UserContext | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<MeResponse>;
  register: (input: { name: string; email: string; password: string; college?: string; wantsToOrganize?: boolean }) => Promise<MeResponse>;
  logout: () => Promise<void>;
  refresh: () => void;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<MeResponse>("/auth/me"), staleTime: 60_000 });

  const loginM = useMutation({
    mutationFn: (v: { email: string; password: string }) => api<MeResponse>("/auth/login", { body: v }),
    onSuccess: (data) => {
      qc.clear();
      qc.setQueryData(["me"], data);
    },
  });
  const registerM = useMutation({
    mutationFn: (v: Parameters<AuthValue["register"]>[0]) => api<MeResponse>("/auth/register", { body: v }),
    onSuccess: (data) => {
      qc.clear();
      qc.setQueryData(["me"], data);
    },
  });

  const value = useMemo<AuthValue>(
    () => ({
      user: me.data?.user ?? null,
      context: me.data?.context ?? null,
      loading: me.isLoading,
      login: (email, password) => loginM.mutateAsync({ email, password }),
      register: (input) => registerM.mutateAsync(input),
      logout: async () => {
        await api("/auth/logout", { method: "POST" });
        qc.clear();
        qc.setQueryData(["me"], { user: null, context: null });
      },
      refresh: () => qc.invalidateQueries({ queryKey: ["me"] }),
    }),
    [me.data, me.isLoading, loginM, registerM, qc],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
