"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { PROGRAM_ID, getMarketPDA, getVaultPDA, isMarketOpen, isMarketResolved, getMarketStatusString } from "@/lib/program";
import { useMarkets, MarketWithPubkey } from "@/hooks/useMarkets";
import idl from "@/lib/idl.json";

export default function AdminPage() {
  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { markets, loading: marketsLoading, refetch } = useMarkets();

  const [question, setQuestion] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // For resolve actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError("Please connect your wallet first");
      return;
    }

    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    if (!resolutionDate) {
      setError("Please select a resolution date");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);

      // Generate a unique market ID
      const marketId = new BN(Date.now());
      const resolutionTime = new BN(Math.floor(new Date(resolutionDate).getTime() / 1000));

      // Derive PDAs
      const [marketPda] = getMarketPDA(marketId);
      const [vaultPda] = getVaultPDA(marketPda);

      // Create market transaction
      const tx = await program.methods
        .createMarket(marketId, question.trim(), resolutionTime)
        .accounts({
          authority: publicKey,
          market: marketPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setSuccess(`Market created successfully! TX: ${tx.slice(0, 8)}...`);
      setQuestion("");
      setResolutionDate("");
      refetch();

      window.open(
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
        "_blank"
      );
    } catch (err: any) {
      console.error("Error creating market:", err);
      setError(err.message || "Failed to create market");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMarket = async (market: MarketWithPubkey) => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError("Please connect your wallet first");
      return;
    }

    setActionLoading(market.publicKey.toBase58());
    setError(null);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);

      const tx = await program.methods
        .closeMarket()
        .accounts({
          authority: publicKey,
          market: market.publicKey,
        })
        .rpc();

      setSuccess(`Market closed! TX: ${tx.slice(0, 8)}...`);
      refetch();
    } catch (err: any) {
      console.error("Error closing market:", err);
      setError(err.message || "Failed to close market");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveMarket = async (market: MarketWithPubkey, outcome: boolean) => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError("Please connect your wallet first");
      return;
    }

    setActionLoading(market.publicKey.toBase58());
    setError(null);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);

      const tx = await program.methods
        .resolveMarket(outcome)
        .accounts({
          authority: publicKey,
          market: market.publicKey,
        })
        .rpc();

      setSuccess(`Market resolved as ${outcome ? "YES" : "NO"}! TX: ${tx.slice(0, 8)}...`);
      refetch();

      window.open(
        `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
        "_blank"
      );
    } catch (err: any) {
      console.error("Error resolving market:", err);
      setError(err.message || "Failed to resolve market");
    } finally {
      setActionLoading(null);
    }
  };

  // Suggested markets for quick creation
  const suggestedMarkets = [
    { question: "Will SOL hit $500 by March 2026?", category: "Crypto" },
    { question: "Will Bitcoin ETF see $1B daily inflows?", category: "Crypto" },
    { question: "Will Ethereum complete Pectra upgrade in Q1 2026?", category: "Tech" },
    { question: "Will SpaceX launch Starship to orbit this month?", category: "Space" },
  ];

  return (
    <main className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-in">
        <Link
          href="/markets"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm mb-4"
        >
          <Icon icon="solar:arrow-left-outline" width={16} />
          Back to Markets
        </Link>
        <h1 className="text-3xl lg:text-4xl font-light text-white font-dm-sans tracking-tight">
          Admin Panel
        </h1>
        <p className="text-slate-400 mt-2">
          Create and manage prediction markets
        </p>
      </div>

      {/* Wallet Check */}
      {!connected && (
        <div className="bg-[#FACC15]/10 border border-[#FACC15]/20 rounded-xl p-6 mb-8 animate-in-delay-1">
          <div className="flex items-start gap-4">
            <Icon icon="solar:wallet-outline" width={24} className="text-[#FACC15] mt-1" />
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Connect Wallet Required</h3>
              <p className="text-slate-400 text-sm mb-4">
                You need to connect your wallet to manage markets.
              </p>
              <button
                onClick={() => setVisible(true)}
                className="px-5 py-2.5 bg-[#FACC15] text-neutral-900 rounded-full font-medium text-sm hover:bg-[#FACC15]/90 transition-all"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-6 animate-in">
          <Icon icon="solar:danger-triangle-outline" width={18} className="text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400">
            <Icon icon="solar:close-circle-outline" width={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-6 animate-in">
          <Icon icon="solar:check-circle-outline" width={18} className="text-green-400" />
          <span className="text-green-400 text-sm">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400">
            <Icon icon="solar:close-circle-outline" width={18} />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Create Market Form */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 lg:p-8 animate-in-delay-1">
          <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
            <Icon icon="solar:add-circle-outline" width={24} className="text-[#FACC15]" />
            Create New Market
          </h2>
          <form onSubmit={handleCreateMarket} className="space-y-6">
            {/* Question Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Market Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Will Bitcoin hit $100,000 by end of 2026?"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/50 resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-1">
                {question.length}/200 characters
              </p>
            </div>

            {/* Resolution Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Resolution Date
              </label>
              <input
                type="datetime-local"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/50"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !connected}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#FACC15] text-neutral-900 rounded-xl font-medium hover:bg-[#FACC15]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Icon icon="solar:refresh-circle-outline" width={20} className="animate-spin" />
                  Creating Market...
                </>
              ) : (
                <>
                  <Icon icon="solar:add-circle-outline" width={20} />
                  Create Market
                </>
              )}
            </button>
          </form>

          {/* Quick Create */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Quick Create</h3>
            <div className="space-y-2">
              {suggestedMarkets.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(suggestion.question)}
                  className="w-full text-left p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:bg-white/[0.04] hover:border-white/10 transition-all text-sm"
                >
                  <span className="text-[#FACC15] text-xs">{suggestion.category}</span>
                  <p className="text-slate-300 mt-1">{suggestion.question}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Manage Markets */}
        <div className="animate-in-delay-2">
          <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
            <Icon icon="solar:settings-outline" width={24} className="text-[#FACC15]" />
            Manage Markets
          </h2>

          {marketsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 animate-pulse">
                  <div className="h-5 bg-white/5 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-white/5 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-8 text-center">
              <Icon icon="solar:chart-square-outline" width={40} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No markets yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {markets.map((market) => {
                const open = isMarketOpen(market.status);
                const resolved = isMarketResolved(market.status);
                const isLoading = actionLoading === market.publicKey.toBase58();
                const isAuthority = publicKey?.equals(market.authority);

                return (
                  <div
                    key={market.publicKey.toBase58()}
                    className="bg-white/[0.02] border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-slate-500">
                        #{market.marketId.toString().slice(-6)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          open
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : resolved
                            ? "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20"
                            : "bg-white/5 text-slate-400 border-white/10"
                        }`}
                      >
                        {getMarketStatusString(market.status)}
                      </span>
                    </div>

                    <p className="text-white font-medium mb-3 line-clamp-2">
                      {market.question}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                      <span>{market.participantCount} bets</span>
                      <span>·</span>
                      <span>
                        Resolves {new Date(market.resolutionTime.toNumber() * 1000).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    {isAuthority && open && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCloseMarket(market)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Icon icon="solar:refresh-circle-outline" width={16} className="animate-spin" />
                          ) : (
                            <Icon icon="solar:lock-outline" width={16} />
                          )}
                          Close Betting
                        </button>
                      </div>
                    )}

                    {isAuthority && !open && !resolved && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveMarket(market, true)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Icon icon="solar:refresh-circle-outline" width={16} className="animate-spin" />
                          ) : (
                            <Icon icon="solar:check-circle-outline" width={16} />
                          )}
                          Resolve YES
                        </button>
                        <button
                          onClick={() => handleResolveMarket(market, false)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Icon icon="solar:refresh-circle-outline" width={16} className="animate-spin" />
                          ) : (
                            <Icon icon="solar:close-circle-outline" width={16} />
                          )}
                          Resolve NO
                        </button>
                      </div>
                    )}

                    {!isAuthority && (
                      <p className="text-xs text-slate-500 italic">
                        Only the market creator can manage this market
                      </p>
                    )}

                    {resolved && (
                      <p className="text-xs text-[#FACC15]">
                        Market resolved - winners can now claim
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-xl animate-in-delay-3">
        <div className="flex items-start gap-3">
          <Icon icon="solar:info-circle-outline" width={20} className="text-slate-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-2">
              <strong className="text-slate-300">Resolution Flow:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li><strong>Create</strong> - Set up a YES/NO question with a resolution date</li>
              <li><strong>Close Betting</strong> - Stop accepting new bets when ready to resolve</li>
              <li><strong>Resolve</strong> - Declare the outcome (YES or NO won)</li>
              <li><strong>Winners Claim</strong> - Users go to Portfolio to claim winnings</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
