"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useMarkets } from "@/hooks/useMarkets";
import { isMarketOpen, getMarketStatusString } from "@/lib/program";

export default function MarketsPage() {
  const { markets, loading, error, refetch } = useMarkets();

  return (
    <main className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 animate-in">
        <div>
          <h1 className="text-3xl lg:text-4xl font-light text-white font-dm-sans tracking-tight">
            Prediction Markets
          </h1>
          <p className="text-slate-400 mt-2">
            Browse active markets and place your encrypted bets
          </p>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FACC15] text-neutral-900 rounded-full font-medium text-sm hover:bg-[#FACC15]/90 transition-all w-fit"
        >
          <Icon icon="solar:add-circle-outline" width={18} />
          Create Market
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-in-delay-1">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Active Markets</p>
          <p className="text-2xl font-light text-white">
            {loading ? "-" : markets.filter((m) => isMarketOpen(m.status)).length}
          </p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Total Markets</p>
          <p className="text-2xl font-light text-white">
            {loading ? "-" : markets.length}
          </p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Total Participants</p>
          <p className="text-2xl font-light text-white">
            {loading
              ? "-"
              : markets.reduce((acc, m) => acc + m.participantCount, 0)}
          </p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Network</p>
          <p className="text-2xl font-light text-[#FACC15]">Devnet</p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 flex items-center gap-3">
          <Icon icon="solar:danger-triangle-outline" width={24} className="text-red-400" />
          <div>
            <p className="text-red-400 font-medium">Error loading markets</p>
            <p className="text-red-400/70 text-sm">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="ml-auto px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Markets Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in-delay-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 animate-pulse"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="h-5 bg-white/5 rounded w-16" />
                <div className="h-5 bg-white/5 rounded w-20" />
              </div>
              <div className="h-6 bg-white/5 rounded w-full mb-2" />
              <div className="h-6 bg-white/5 rounded w-3/4 mb-6" />
              <div className="flex justify-between">
                <div className="h-4 bg-white/5 rounded w-24" />
                <div className="h-4 bg-white/5 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-20 animate-in-delay-2">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <Icon icon="solar:chart-square-outline" width={40} className="text-slate-500" />
          </div>
          <h3 className="text-xl text-white font-medium mb-2">No markets yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Be the first to create a prediction market and start the action.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FACC15] text-neutral-900 rounded-full font-medium hover:bg-[#FACC15]/90 transition-all"
          >
            <Icon icon="solar:add-circle-outline" width={20} />
            Create First Market
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in-delay-2">
          {markets.map((market) => (
            <Link
              key={market.publicKey.toBase58()}
              href={`/markets/${market.publicKey.toBase58()}`}
              className="group bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
            >
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs text-slate-500 font-medium">
                  #{market.marketId.toString().slice(-6)}
                </span>
                <span
                  className={`text-xs px-3 py-1 rounded-full border ${
                    isMarketOpen(market.status)
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-white/5 text-slate-400 border-white/10"
                  }`}
                >
                  {getMarketStatusString(market.status)}
                </span>
              </div>

              {/* Question */}
              <h3 className="text-lg text-white font-medium mb-4 group-hover:text-[#FACC15] transition-colors line-clamp-2">
                {market.question}
              </h3>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-slate-400">
                  <Icon icon="solar:users-group-rounded-outline" width={16} />
                  <span>{market.participantCount} bets</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Icon icon="solar:clock-circle-outline" width={16} />
                  <span>
                    {new Date(market.resolutionTime.toNumber() * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Encrypted indicator */}
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-slate-500">
                <Icon icon="solar:lock-keyhole-outline" width={14} />
                <span>Bets are encrypted</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
