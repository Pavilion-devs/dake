"use client";

import {
  WalletProvider,
  ConnectionProvider,
} from "@solana/wallet-adapter-react";
import { useMemo, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

import "@solana/wallet-adapter-react-ui/styles.css";

const WalletModalProvider = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      ({ WalletModalProvider }) => WalletModalProvider
    ),
  { ssr: false }
);

const AppNavbar = dynamic(() => import("./AppNavbar"), { ssr: false });

const emptySubscribe = () => () => {};

// Loading skeleton while wallet provider initializes
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0f0f11]">
      <div className="border-b border-white/10 py-4 px-6 lg:px-8">
        <div className="animate-pulse flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="h-8 w-24 bg-white/5 rounded" />
            <div className="hidden md:flex gap-6">
              <div className="h-4 w-16 bg-white/5 rounded" />
              <div className="h-4 w-16 bg-white/5 rounded" />
            </div>
          </div>
          <div className="h-10 w-36 bg-white/5 rounded-full" />
        </div>
      </div>
      <main className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-10 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-6 bg-white/5 rounded w-1/2 mb-12" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 h-48"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://devnet.helius-rpc.com/?api-key=f3a344d5-c515-4ee1-a858-b190af0317a3";

  const config = {
    commitment: "confirmed" as const,
    wsEndpoint: endpoint.replace("https", "wss").replace("?", "/?"),
    confirmTransactionInitialTimeout: 60000,
  };

  // Empty array - let the wallet adapter auto-detect installed wallets
  // This prevents duplicate key issues from manually specifying adapters
  const wallets = useMemo(() => [], []);

  // During SSR or before mount, show loading skeleton
  if (!mounted) {
    return <LoadingSkeleton />;
  }

  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          <div className="min-h-screen bg-[#0f0f11]">
            <AppNavbar />
            {children}
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
