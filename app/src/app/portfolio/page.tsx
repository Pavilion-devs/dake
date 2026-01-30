"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  PROGRAM_ID,
  INCO_LIGHTNING_PROGRAM_ID,
  getVaultPDA,
  getMarketStatusString,
  isMarketResolved,
  PositionAccount,
  MarketAccount,
} from "@/lib/program";
import idl from "@/lib/idl.json";

interface PositionWithMarket {
  positionPubkey: PublicKey;
  position: PositionAccount;
  marketPubkey: PublicKey;
  market: MarketAccount;
}

export default function PortfolioPage() {
  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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

      // Fetch all positions for this user
      const positionAccounts = await (program.account as any).position.all([
        {
          memcmp: {
            offset: 8 + 32, // After discriminator + market pubkey
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      // Fetch corresponding markets
      const positionsWithMarkets: PositionWithMarket[] = [];

      for (const posAccount of positionAccounts) {
        try {
          const marketAccount = await (program.account as any).market.fetch(
            posAccount.account.market
          );
          positionsWithMarkets.push({
            positionPubkey: posAccount.publicKey,
            position: posAccount.account,
            marketPubkey: posAccount.account.market,
            market: marketAccount,
          });
        } catch (e) {
          console.error("Error fetching market for position:", e);
        }
      }

      setPositions(positionsWithMarkets);
    } catch (err) {
      console.error("Error fetching positions:", err);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleCheckWinner = async (positionData: PositionWithMarket) => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setClaimError("Please connect your wallet");
      return;
    }

    setClaiming(positionData.positionPubkey.toBase58());
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);

      // Call check_winner instruction
      // IDL: check_winner() with accounts: checker, market, position, system_program, inco_lightning_program
      const tx = await program.methods
        .checkWinner()
        .accounts({
          checker: publicKey,
          market: positionData.marketPubkey,
          position: positionData.positionPubkey,
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        })
        .rpc();

      setClaimSuccess(`Winner check submitted! TX: ${tx.slice(0, 8)}...`);
      fetchPositions();
    } catch (err: any) {
      console.error("Error checking winner:", err);
      setClaimError(err.message || "Failed to check winner status");
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimWinnings = async (positionData: PositionWithMarket) => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setClaimError("Please connect your wallet");
      return;
    }

    setClaiming(positionData.positionPubkey.toBase58());
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);
      const [vaultPda] = getVaultPDA(positionData.marketPubkey);

      // The claim instruction needs a decryption proof
      // For now, we'll use placeholder bytes - the actual implementation
      // would need to use Inco's decryption callback mechanism
      const handleBytes = Buffer.alloc(16); // Placeholder
      const plaintextBytes = Buffer.alloc(1); // Placeholder

      // Call claim_winnings instruction
      // IDL: claim_winnings(handle: bytes, plaintext: bytes)
      const tx = await program.methods
        .claimWinnings(handleBytes, plaintextBytes)
        .accounts({
          winner: publicKey,
          market: positionData.marketPubkey,
          position: positionData.positionPubkey,
          vault: vaultPda,
          instructions: new PublicKey("Sysvar1nstructions1111111111111111111111111"),
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        })
        .rpc();

      setClaimSuccess(`Winnings claimed! TX: ${tx.slice(0, 8)}...`);
      fetchPositions();

      window.open(
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
        "_blank"
      );
    } catch (err: any) {
      console.error("Error claiming:", err);
      if (err.message?.includes("NotWinner")) {
        setClaimError("You didn't win this market");
      } else {
        setClaimError(err.message || "Failed to claim winnings");
      }
    } finally {
      setClaiming(null);
    }
  };

  if (!connected) {
    return (
      <main className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="text-center py-20 animate-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FACC15]/10 flex items-center justify-center">
            <Icon icon="solar:wallet-outline" width={40} className="text-[#FACC15]" />
          </div>
          <h2 className="text-2xl text-white font-medium mb-2">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Connect your wallet to view your prediction market positions and claim winnings.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FACC15] text-neutral-900 rounded-full font-medium hover:bg-[#FACC15]/90 transition-all"
          >
            <Icon icon="solar:wallet-outline" width={20} />
            Connect Wallet
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-in">
        <h1 className="text-3xl lg:text-4xl font-light text-white font-dm-sans tracking-tight">
          Your Portfolio
        </h1>
        <p className="text-slate-400 mt-2">
          View your positions and claim winnings from resolved markets
        </p>
      </div>

      {/* Error/Success Messages */}
      {claimError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-6 animate-in">
          <Icon icon="solar:danger-triangle-outline" width={18} className="text-red-400" />
          <span className="text-red-400 text-sm">{claimError}</span>
          <button
            onClick={() => setClaimError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <Icon icon="solar:close-circle-outline" width={18} />
          </button>
        </div>
      )}

      {claimSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-6 animate-in">
          <Icon icon="solar:check-circle-outline" width={18} className="text-green-400" />
          <span className="text-green-400 text-sm">{claimSuccess}</span>
          <button
            onClick={() => setClaimSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-300"
          >
            <Icon icon="solar:close-circle-outline" width={18} />
          </button>
        </div>
      )}

      {/* Positions List */}
      {loading ? (
        <div className="space-y-4 animate-in-delay-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 animate-pulse"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="h-5 bg-white/5 rounded w-20" />
                <div className="h-5 bg-white/5 rounded w-24" />
              </div>
              <div className="h-6 bg-white/5 rounded w-3/4 mb-4" />
              <div className="h-10 bg-white/5 rounded w-32" />
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-20 animate-in-delay-1">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <Icon icon="solar:chart-square-outline" width={40} className="text-slate-500" />
          </div>
          <h3 className="text-xl text-white font-medium mb-2">No positions yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            You haven't placed any bets yet. Browse markets and make your first prediction!
          </p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FACC15] text-neutral-900 rounded-full font-medium hover:bg-[#FACC15]/90 transition-all"
          >
            <Icon icon="solar:chart-square-outline" width={20} />
            Browse Markets
          </Link>
        </div>
      ) : (
        <div className="space-y-4 animate-in-delay-1">
          {positions.map((pos) => {
            const resolved = isMarketResolved(pos.market.status);
            const isClaiming = claiming === pos.positionPubkey.toBase58();

            return (
              <div
                key={pos.positionPubkey.toBase58()}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.03] transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs text-slate-500">
                    #{pos.market.marketId.toString().slice(-6)}
                  </span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full border ${
                      resolved
                        ? "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}
                  >
                    {getMarketStatusString(pos.market.status)}
                  </span>
                </div>

                <Link
                  href={`/markets/${pos.marketPubkey.toBase58()}`}
                  className="block text-lg text-white font-medium mb-4 hover:text-[#FACC15] transition-colors"
                >
                  {pos.market.question}
                </Link>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Icon icon="solar:lock-keyhole-outline" width={16} />
                    <span>Position encrypted</span>
                  </div>
                  {pos.position.claimed && (
                    <div className="flex items-center gap-2 text-green-400">
                      <Icon icon="solar:check-circle-outline" width={16} />
                      <span>Claimed</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {resolved && !pos.position.claimed && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCheckWinner(pos)}
                      disabled={isClaiming}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {isClaiming ? (
                        <Icon icon="solar:refresh-circle-outline" width={16} className="animate-spin" />
                      ) : (
                        <Icon icon="solar:eye-outline" width={16} />
                      )}
                      Check if Winner
                    </button>
                    <button
                      onClick={() => handleClaimWinnings(pos)}
                      disabled={isClaiming}
                      className="flex items-center gap-2 px-4 py-2 bg-[#FACC15] text-neutral-900 rounded-lg text-sm font-medium hover:bg-[#FACC15]/90 transition-colors disabled:opacity-50"
                    >
                      {isClaiming ? (
                        <Icon icon="solar:refresh-circle-outline" width={16} className="animate-spin" />
                      ) : (
                        <Icon icon="solar:wallet-money-outline" width={16} />
                      )}
                      Claim Winnings
                    </button>
                  </div>
                )}

                {!resolved && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Icon icon="solar:clock-circle-outline" width={16} />
                    <span>
                      Resolves {new Date(pos.market.resolutionTime.toNumber() * 1000).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {pos.position.claimed && (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <Icon icon="solar:check-circle-outline" width={16} />
                    <span>Winnings claimed successfully</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-xl animate-in-delay-2">
        <div className="flex items-start gap-3">
          <Icon icon="solar:info-circle-outline" width={20} className="text-slate-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p>
              <strong className="text-slate-300">Privacy note:</strong> Your bet amount and side
              remain encrypted. Even if you lose, your position stays private forever.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
