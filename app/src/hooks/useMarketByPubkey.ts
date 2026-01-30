"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback } from "react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { MarketAccount } from "@/lib/program";
import idl from "@/lib/idl.json";

export interface MarketWithPubkey extends MarketAccount {
  publicKey: PublicKey;
}

export function useMarketByPubkey(pubkeyString: string | null) {
  const { connection } = useConnection();
  const [market, setMarket] = useState<MarketWithPubkey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = useCallback(async () => {
    if (!pubkeyString) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new AnchorProvider(
        connection,
        {
          publicKey: PublicKey.default,
          signTransaction: async (tx) => tx,
          signAllTransactions: async (txs) => txs,
        },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);

      const marketPda = new PublicKey(pubkeyString);

      // Fetch the market account
      const marketAccount = await (program.account as any).market.fetch(marketPda);

      setMarket({
        publicKey: marketPda,
        ...marketAccount,
      });
    } catch (err) {
      console.error("Error fetching market:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch market");
    } finally {
      setLoading(false);
    }
  }, [connection, pubkeyString]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  return { market, loading, error, refetch: fetchMarket };
}
