"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback } from "react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, MarketAccount } from "@/lib/program";
import idl from "@/lib/idl.json";

export interface MarketWithPubkey extends MarketAccount {
  publicKey: PublicKey;
}

export function useMarkets() {
  const { connection } = useConnection();
  const [markets, setMarkets] = useState<MarketWithPubkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create a read-only provider (no wallet needed for fetching)
      const provider = new AnchorProvider(
        connection,
        // Dummy wallet for read-only operations
        {
          publicKey: PublicKey.default,
          signTransaction: async (tx) => tx,
          signAllTransactions: async (txs) => txs,
        },
        { commitment: "confirmed" }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const program = new Program(idl as any, provider);

      // Fetch all market accounts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marketAccounts = await (program.account as any).market.all();

      const formattedMarkets: MarketWithPubkey[] = marketAccounts.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (account: any) => ({
          publicKey: account.publicKey,
          ...account.account,
        })
      );

      // Sort by market ID (newest first)
      formattedMarkets.sort((a, b) =>
        b.marketId.toNumber() - a.marketId.toNumber()
      );

      setMarkets(formattedMarkets);
    } catch (err) {
      console.error("Error fetching markets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return { markets, loading, error, refetch: fetchMarkets };
}

export function useMarket(marketId: number | null) {
  const { connection } = useConnection();
  const [market, setMarket] = useState<MarketWithPubkey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = useCallback(async () => {
    if (marketId === null) {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const program = new Program(idl as any, provider);

      // Derive market PDA
      const { BN } = await import("@coral-xyz/anchor");
      const marketIdBN = new BN(marketId);
      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), marketIdBN.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      // Fetch the market account
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [connection, marketId]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  return { market, loading, error, refetch: fetchMarket };
}
