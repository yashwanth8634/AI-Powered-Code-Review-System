"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { apiRequest } from "@/lib/http/client";
import type { AnalyzeAcceptedResponse } from "@/lib/types";

interface ScanContextValue {
  isStarting: boolean;
  error: string;
  startScan: (gitUrl: string) => Promise<AnalyzeAcceptedResponse>;
  clearError: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const startScan = useCallback(async (gitUrl: string) => {
    setIsStarting(true);
    setError("");

    try {
      return await apiRequest<AnalyzeAcceptedResponse>("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gitUrl }),
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while starting the scan.";
      setError(message);
      throw requestError;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      isStarting,
      error,
      startScan,
      clearError: () => setError(""),
    }),
    [error, isStarting, startScan],
  );

  return (
    <SessionProvider>
      <ScanContext.Provider value={value}>{children}</ScanContext.Provider>
    </SessionProvider>
  );
}

export function useScanState(): ScanContextValue {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error("useScanState must be used inside AppProviders.");
  }
  return context;
}
