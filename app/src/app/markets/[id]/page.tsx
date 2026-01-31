"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { encryptValue } from "@inco/solana-sdk/encryption";
import {
  PROGRAM_ID,
  INCO_LIGHTNING_PROGRAM_ID,
  getPositionPDA,
  getVaultPDA,
  isMarketOpen,
  isMarketResolved,
  getMarketStatusString,
  PositionAccount,
} from "@/lib/program";
import { useMarketByPubkey } from "@/hooks/useMarketByPubkey";
import idl from "@/lib/idl.json";
import AIChatPanel from "@/components/app/AIChatPanel";
import { MarketContext } from "@/types/chat";

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const { market, loading, error, refetch } = useMarketByPubkey(id);

  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [placingBet, setPlacingBet] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [betSuccess, setBetSuccess] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Check if user already has a position
  const [userPosition, setUserPosition] = useState<PositionAccount | null>(null);
  const [loadingPosition, setLoadingPosition] = useState(false);

  const checkExistingPosition = useCallback(async () => {
    if (!publicKey || !market) return;

    setLoadingPosition(true);
    try {
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
      const [positionPda] = getPositionPDA(market.publicKey, publicKey);

      try {
        const position = await (program.account as any).position.fetch(positionPda);
        setUserPosition(position);
      } catch {
        // Position doesn't exist - user hasn't bet yet
        setUserPosition(null);
      }
    } catch (err) {
      console.error("Error checking position:", err);
    } finally {
      setLoadingPosition(false);
    }
  }, [connection, publicKey, market]);

  useEffect(() => {
    checkExistingPosition();
  }, [checkExistingPosition]);

  // Calculate potential payout using parimutuel formula
  // Payout = (your_bet / winning_pool) * total_pool
  const calculatePotentialPayout = (side: "yes" | "no", amount: number) => {
    if (!market || amount <= 0) return null;

    const yesPool = market.totalYesAmount.toNumber() / LAMPORTS_PER_SOL;
    const noPool = market.totalNoAmount.toNumber() / LAMPORTS_PER_SOL;
    const totalPool = yesPool + noPool;

    // Add user's bet to their side's pool
    const newYesPool = side === "yes" ? yesPool + amount : yesPool;
    const newNoPool = side === "no" ? noPool + amount : noPool;
    const newTotalPool = newYesPool + newNoPool;

    // Pool user would win from
    const winningPool = side === "yes" ? newYesPool : newNoPool;

    if (winningPool === 0) return null;

    // Payout = (user_bet / winning_pool) * total_pool
    const payout = (amount / winningPool) * newTotalPool;
    const profit = payout - amount;
    const multiplier = payout / amount;

    // Calculate implied probability (your pool / total pool)
    const impliedProbability = (winningPool / newTotalPool) * 100;

    return { payout, profit, multiplier, impliedProbability };
  };

  // Calculate current market odds
  const calculateOdds = () => {
    const yesPool = market?.totalYesAmount.toNumber() || 0;
    const noPool = market?.totalNoAmount.toNumber() || 0;
    const total = yesPool + noPool;

    if (total === 0) return { yesOdds: 2.0, noOdds: 2.0, yesProbability: 50, noProbability: 50 };

    // Odds = total_pool / side_pool
    const yesOdds = total / yesPool;
    const noOdds = total / noPool;

    // Probability = side_pool / total_pool
    const yesProbability = (yesPool / total) * 100;
    const noProbability = (noPool / total) * 100;

    return { yesOdds, noOdds, yesProbability, noProbability };
  };

  const odds = market ? calculateOdds() : null;

  const potentialPayout = selectedSide && betAmount
    ? calculatePotentialPayout(selectedSide, parseFloat(betAmount) || 0)
    : null;

  const handlePlaceBet = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions || !market) {
      setBetError("Please connect your wallet first");
      return;
    }

    if (!selectedSide) {
      setBetError("Please select YES or NO");
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setBetError("Please enter a valid amount");
      return;
    }

    setPlacingBet(true);
    setBetError(null);
    setBetSuccess(null);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);

      // Derive PDAs
      const [positionPda] = getPositionPDA(market.publicKey, publicKey);
      const [vaultPda] = getVaultPDA(market.publicKey);

      // Convert amount to lamports
      const lamports = new BN(amount * LAMPORTS_PER_SOL);

      // Side: 1 = YES, 0 = NO
      const sideValue = selectedSide === "yes" ? 1 : 0;

      // Encrypt the side using Inco SDK
      const encryptedSideHex = await encryptValue(sideValue);
      const encryptedSideBytes = Buffer.from(encryptedSideHex.replace("0x", ""), "hex");

      // Place bet transaction
      const tx = await program.methods
        .placeBet(encryptedSideBytes, lamports, sideValue)
        .accounts({
          bettor: publicKey,
          market: market.publicKey,
          position: positionPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        })
        .rpc();

      setBetSuccess(`Bet placed successfully! TX: ${tx.slice(0, 8)}...`);
      setBetAmount("");
      setSelectedSide(null);
      refetch();
      checkExistingPosition();

      window.open(
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
        "_blank"
      );
    } catch (err: any) {
      console.error("Error placing bet:", err);
      setBetError(err.message || "Failed to place bet");
    } finally {
      setPlacingBet(false);
    }
  };

  if (loading) {
    return (
      <main className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-6 bg-white/5 rounded w-24 mb-6" />
          <div className="h-10 bg-white/5 rounded w-3/4 mb-4" />
          <div className="h-6 bg-white/5 rounded w-1/2 mb-8" />
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="h-32 bg-white/5 rounded-2xl" />
            <div className="h-32 bg-white/5 rounded-2xl" />
          </div>
          <div className="h-48 bg-white/5 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error || !market) {
    return (
      <main className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Link
          href="/markets"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <Icon icon="solar:arrow-left-outline" width={16} />
          Back to Markets
        </Link>
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <Icon icon="solar:danger-triangle-outline" width={40} className="text-red-400" />
          </div>
          <h3 className="text-xl text-white font-medium mb-2">Market not found</h3>
          <p className="text-slate-400 mb-6">{error || "This market doesn't exist"}</p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-full font-medium hover:bg-white/10 transition-all"
          >
            View All Markets
          </Link>
        </div>
      </main>
    );
  }

  const marketOpen = isMarketOpen(market.status);
  const marketResolved = isMarketResolved(market.status);
  const yesPool = market.totalYesAmount.toNumber() / LAMPORTS_PER_SOL;
  const noPool = market.totalNoAmount.toNumber() / LAMPORTS_PER_SOL;
  const totalPool = yesPool + noPool;

  return (
    <main className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/markets"
        className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm mb-6 animate-in"
      >
        <Icon icon="solar:arrow-left-outline" width={16} />
        Back to Markets
      </Link>

      {/* Market Header */}
      <div className="mb-8 animate-in">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`text-xs px-3 py-1 rounded-full border ${
              marketOpen
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : marketResolved
                ? "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20"
                : "bg-white/5 text-slate-400 border-white/10"
            }`}
          >
            {getMarketStatusString(market.status)}
          </span>
          <span className="text-xs text-slate-500">
            #{market.marketId.toString().slice(-6)}
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-light text-white font-dm-sans tracking-tight mb-3">
          {market.question}
        </h1>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-1">
            <Icon icon="solar:users-group-rounded-outline" width={16} />
            <span>{market.participantCount} bets placed</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon icon="solar:clock-circle-outline" width={16} />
            <span>
              Resolves {new Date(market.resolutionTime.toNumber() * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Odds & Pool Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 animate-in-delay-1">
        <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-green-400 text-sm font-medium">YES</span>
            <span className="text-xs text-slate-400">{yesPool.toFixed(2)} SOL pool</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{odds?.yesOdds.toFixed(2)}x</span>
            <span className="text-sm text-slate-400">{odds?.yesProbability.toFixed(0)}% chance</span>
          </div>
        </div>
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-red-400 text-sm font-medium">NO</span>
            <span className="text-xs text-slate-400">{noPool.toFixed(2)} SOL pool</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{odds?.noOdds.toFixed(2)}x</span>
            <span className="text-sm text-slate-400">{odds?.noProbability.toFixed(0)}% chance</span>
          </div>
        </div>
      </div>

      {/* Total Pool */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-6 animate-in-delay-1">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Total Pool</span>
          <span className="text-xl font-medium text-[#FACC15]">{totalPool.toFixed(2)} SOL</span>
        </div>
      </div>

      {/* User Already Has Position */}
      {userPosition && !loadingPosition && (
        <div className="bg-[#FACC15]/10 border border-[#FACC15]/20 rounded-xl p-6 mb-6 animate-in-delay-1">
          <div className="flex items-start gap-4">
            <Icon icon="solar:check-circle-bold" width={24} className="text-[#FACC15]" />
            <div className="flex-1">
              <h3 className="text-white font-medium mb-2">You have a position in this market</h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Your Bet</p>
                  <p className="text-lg font-bold text-white">
                    {(userPosition.amount.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Locked Payout (if win)</p>
                  <p className="text-lg font-bold text-green-400">
                    {(() => {
                      try {
                        const payout = userPosition.lockedPayout;
                        if (!payout) return "—";
                        const payoutNum = parseFloat(payout.toString()) / LAMPORTS_PER_SOL;
                        if (payoutNum > 1000 || payoutNum < 0 || isNaN(payoutNum)) return "—";
                        return `${payoutNum.toFixed(2)} SOL`;
                      } catch {
                        return "—";
                      }
                    })()}
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-xs mb-3">
                Your side is <span className="text-[#FACC15]">encrypted</span> · Payout is <span className="text-green-400">locked & guaranteed</span>
              </p>
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 text-[#FACC15] text-sm hover:underline"
              >
                View in Portfolio
                <Icon icon="solar:arrow-right-outline" width={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Betting Interface */}
      {marketOpen && !userPosition ? (
        <div className="space-y-6 animate-in-delay-1">
          {/* Side Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Your Prediction
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedSide("yes")}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  selectedSide === "yes"
                    ? "bg-green-500/10 border-green-500 text-green-400"
                    : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Icon icon="solar:check-circle-outline" width={24} />
                  <span className="text-2xl font-medium">YES</span>
                </div>
                <p className="text-lg font-bold text-green-400">{odds?.yesOdds.toFixed(2)}x payout</p>
                <p className="text-xs opacity-70 mt-1">{odds?.yesProbability.toFixed(0)}% implied probability</p>
              </button>
              <button
                onClick={() => setSelectedSide("no")}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  selectedSide === "no"
                    ? "bg-red-500/10 border-red-500 text-red-400"
                    : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Icon icon="solar:close-circle-outline" width={24} />
                  <span className="text-2xl font-medium">NO</span>
                </div>
                <p className="text-lg font-bold text-red-400">{odds?.noOdds.toFixed(2)}x payout</p>
                <p className="text-xs opacity-70 mt-1">{odds?.noProbability.toFixed(0)}% implied probability</p>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Bet Amount (SOL)
            </label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0.1"
                min="0.01"
                step="0.01"
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/50"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                SOL
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {[0.1, 0.5, 1, 5].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount.toString())}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {amount} SOL
                </button>
              ))}
            </div>
          </div>

          {/* Potential Payout Display */}
          {potentialPayout && (
            <div className="bg-[#FACC15]/5 border border-[#FACC15]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="solar:calculator-outline" width={18} className="text-[#FACC15]" />
                <span className="text-[#FACC15] font-medium text-sm">Your Potential Return</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-slate-400 text-xs mb-1">If {selectedSide?.toUpperCase()} wins</p>
                  <p className="text-2xl font-bold text-white">
                    {potentialPayout.payout.toFixed(2)} SOL
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Net Profit</p>
                  <p className="text-2xl font-bold text-green-400">
                    +{potentialPayout.profit.toFixed(2)} SOL
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <div>
                  <span className="text-slate-400 text-xs">Return</span>
                  <p className="text-[#FACC15] font-bold">{potentialPayout.multiplier.toFixed(2)}x</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-xs">Implied Probability</span>
                  <p className="text-white font-medium">{potentialPayout.impliedProbability?.toFixed(0)}%</p>
                </div>
              </div>
              <p className="text-xs text-green-400/70 mt-3 flex items-center gap-1">
                <Icon icon="solar:lock-outline" width={12} />
                Your payout is LOCKED when you bet — it won't change even if others bet after you!
              </p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="flex items-start gap-3 p-4 bg-[#FACC15]/5 border border-[#FACC15]/10 rounded-xl">
            <Icon icon="solar:lock-keyhole-outline" width={20} className="text-[#FACC15] mt-0.5" />
            <div className="text-sm">
              <p className="text-[#FACC15] font-medium mb-1">Your bet is encrypted</p>
              <p className="text-slate-400">
                Nobody can see your position (YES/NO). Only you can reveal it when claiming winnings.
              </p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {betError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <Icon icon="solar:danger-triangle-outline" width={18} className="text-red-400" />
              <span className="text-red-400 text-sm">{betError}</span>
            </div>
          )}

          {betSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Icon icon="solar:check-circle-outline" width={18} className="text-green-400" />
              <span className="text-green-400 text-sm">{betSuccess}</span>
            </div>
          )}

          {/* Place Bet Button */}
          {connected ? (
            <button
              onClick={handlePlaceBet}
              disabled={placingBet || !selectedSide || !betAmount}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#FACC15] text-neutral-900 rounded-xl font-medium hover:bg-[#FACC15]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placingBet ? (
                <>
                  <Icon icon="solar:refresh-circle-outline" width={20} className="animate-spin" />
                  Placing Encrypted Bet...
                </>
              ) : (
                <>
                  <Icon icon="solar:lock-keyhole-outline" width={20} />
                  Place Encrypted Bet
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#FACC15] text-neutral-900 rounded-xl font-medium hover:bg-[#FACC15]/90 transition-all"
            >
              <Icon icon="solar:wallet-outline" width={20} />
              Connect Wallet to Bet
            </button>
          )}
        </div>
      ) : marketOpen && userPosition ? (
        /* User already has position */
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center animate-in-delay-1">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FACC15]/10 flex items-center justify-center">
            <Icon icon="solar:clock-circle-outline" width={32} className="text-[#FACC15]" />
          </div>
          <h3 className="text-xl text-white font-medium mb-2">Waiting for Resolution</h3>
          <p className="text-slate-400 mb-4">
            You've placed your bet. Check back on {new Date(market.resolutionTime.toNumber() * 1000).toLocaleDateString()} to see if you won!
          </p>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-full font-medium hover:bg-white/10 transition-all"
          >
            <Icon icon="solar:wallet-money-outline" width={20} />
            View Portfolio
          </Link>
        </div>
      ) : (
        /* Market Closed/Resolved State */
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center animate-in-delay-1">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Icon
              icon={marketResolved ? "solar:cup-star-outline" : "solar:lock-outline"}
              width={32}
              className="text-slate-400"
            />
          </div>
          <h3 className="text-xl text-white font-medium mb-2">
            {marketResolved ? "Market Resolved" : "Market Closed"}
          </h3>
          <p className="text-slate-400 mb-4">
            {marketResolved
              ? `The outcome was ${getMarketStatusString(market.status).replace("Resolved: ", "")}`
              : "This market is no longer accepting bets"}
          </p>
          {marketResolved && (
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FACC15] text-neutral-900 rounded-full font-medium hover:bg-[#FACC15]/90 transition-all"
            >
              <Icon icon="solar:wallet-money-outline" width={20} />
              Check Your Winnings
            </Link>
          )}
        </div>
      )}

      {/* Market Info */}
      <div className="mt-8 grid gap-4 md:grid-cols-3 animate-in-delay-2">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Total Bets</p>
          <p className="text-xl font-light text-white">{market.participantCount}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Resolution Date</p>
          <p className="text-xl font-light text-white">
            {new Date(market.resolutionTime.toNumber() * 1000).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Market ID</p>
          <p className="text-xl font-light text-white font-mono">
            {market.marketId.toString().slice(-8)}
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-2xl animate-in-delay-3">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Icon icon="solar:info-circle-outline" width={20} className="text-[#FACC15]" />
          How It Works
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FACC15]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#FACC15] font-medium">1</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Place Bet</p>
              <p className="text-slate-400 text-sm">Your side is encrypted</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FACC15]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#FACC15] font-medium">2</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Wait</p>
              <p className="text-slate-400 text-sm">Position stays private</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FACC15]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#FACC15] font-medium">3</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Resolution</p>
              <p className="text-slate-400 text-sm">Admin resolves outcome</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FACC15]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#FACC15] font-medium">4</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Claim</p>
              <p className="text-slate-400 text-sm">Winners get paid</p>
            </div>
          </div>
        </div>
      </div>
      {/* AI Chat Toggle Button */}
      {odds && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 bg-[#FACC15] text-neutral-900 rounded-full font-medium text-sm shadow-lg shadow-[#FACC15]/20 hover:bg-[#FACC15]/90 transition-all z-30"
        >
          <Icon icon="solar:magic-stick-3-linear" width={20} />
          AI Analysis
        </button>
      )}

      {/* AI Chat Panel */}
      {odds && (
        <AIChatPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          market={{
            question: market.question,
            status: getMarketStatusString(market.status),
            totalYesAmount: yesPool,
            totalNoAmount: noPool,
            yesProbability: odds.yesProbability,
            noProbability: odds.noProbability,
            participantCount: market.participantCount,
            resolutionDate: new Date(
              market.resolutionTime.toNumber() * 1000
            ).toLocaleDateString(),
          }}
        />
      )}
    </main>
  );
}
