"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="overflow-hidden min-h-[700px] z-10 relative w-full">
      <div className="absolute inset-0">
        <img
          src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/33f44bf5-8b59-437b-a1e3-87e3db3f82ec_1600w.webp"
          className="w-full h-full object-cover"
          alt="Join Dake"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/90 via-transparent to-blue-500/30 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 via-transparent to-yellow-600/60"></div>
      </div>

      <div className="z-10 p-6 lg:p-24 flex flex-col h-full pt-12 pb-12 relative justify-center max-w-7xl mx-auto">
        <div className="max-w-2xl animate-in-delay-1">
          <h2 className="text-5xl lg:text-7xl text-white tracking-tight leading-[1.1] mb-6 font-dm-sans font-light">
            Your predictions. Your privacy. Your edge.
          </h2>
          <p className="text-white/90 text-xl max-w-lg mb-8 font-sans">
            Join the first confidential prediction market. Bet on crypto, tech, sports, and more — all with encrypted positions.
          </p>
          <Link
            href="/markets"
            className="inline-block hover:bg-black transition-transform hover:scale-105 text-base font-medium text-white bg-neutral-900 rounded-full px-8 py-4 shadow-xl"
          >
            Launch Dake App
          </Link>
        </div>
      </div>

      {/* Phone Mockup - Market Preview */}
      <div className="lg:right-24 lg:bottom-12 lg:w-80 overflow-hidden bg-neutral-900 w-64 border-neutral-900 border-8 rounded-[3rem] absolute right-8 bottom-[-50px] shadow-2xl rotate-[-6deg] animate-in-delay-4 hidden sm:block">
        <div className="flex flex-col bg-[#FACC15] h-[600px] w-full relative">
          {/* Status Bar */}
          <div className="w-full flex justify-between items-center px-6 pt-5 pb-2">
            <span className="text-xs font-semibold text-neutral-900 font-sans">9:41</span>
            <div className="flex gap-1.5 items-center">
              <div className="w-4 h-4 rounded-full bg-neutral-900/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-900"></div>
              </div>
              <div className="w-4 h-4 rounded-full bg-neutral-900"></div>
            </div>
          </div>

          {/* App Header */}
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neutral-900 rounded-full flex items-center justify-center text-white">
                <Icon icon="solar:eye-scan-linear" width={16} />
              </div>
              <span className="font-dm-sans font-medium text-neutral-900 tracking-tight">Dake</span>
            </div>
            <button className="w-8 h-8 rounded-full border border-neutral-900/10 flex items-center justify-center hover:bg-neutral-900/5 transition-colors">
              <Icon icon="solar:wallet-linear" width={18} className="text-neutral-900" />
            </button>
          </div>

          {/* Active Market */}
          <div className="px-6 pt-2 pb-6">
            <span className="text-xs font-medium text-neutral-800/60 uppercase tracking-wider font-sans block mb-1">
              Featured Market
            </span>
            <div className="mb-4">
              <span className="text-lg tracking-tight font-dm-sans font-light text-neutral-900">
                Will BTC hit $200k by 2026?
              </span>
            </div>

            {/* Odds Display */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-green-500/20 border border-green-500/30 rounded-2xl p-3 text-center">
                <p className="text-xs text-green-700 font-sans mb-1">YES</p>
                <p className="text-2xl font-dm-sans text-green-700">35%</p>
              </div>
              <div className="flex-1 bg-red-500/20 border border-red-500/30 rounded-2xl p-3 text-center">
                <p className="text-xs text-red-700 font-sans mb-1">NO</p>
                <p className="text-2xl font-dm-sans text-red-700">65%</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button className="flex-1 bg-neutral-900 text-white h-12 rounded-full flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-neutral-900/10 hover:bg-neutral-800 transition-colors font-sans">
                <Icon icon="solar:lock-linear" width={18} />
                Place Bet
              </button>
            </div>
          </div>

          {/* Bottom Sheet - Your Positions */}
          <div className="flex-1 bg-white rounded-t-[2.5rem] p-6 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative overflow-hidden">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-neutral-100 rounded-full"></div>

            <div className="flex justify-between items-end mt-2">
              <h3 className="font-dm-sans text-lg font-medium text-neutral-900">Your Positions</h3>
              <span className="text-xs font-medium text-neutral-400 font-sans cursor-pointer hover:text-neutral-900 transition-colors">
                View All
              </span>
            </div>

            <div className="space-y-5">
              {/* Position 1 */}
              <div className="flex justify-between items-center group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                    <Icon icon="cryptocurrency-color:sol" width={24} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-neutral-900 font-sans">SOL $500 Market</p>
                    <p className="text-xs text-neutral-400 font-sans">Position: <span className="text-yellow-600">Hidden</span></p>
                  </div>
                </div>
                <Icon icon="solar:lock-linear" width={18} className="text-yellow-500" />
              </div>

              {/* Position 2 */}
              <div className="flex justify-between items-center group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                    <Icon icon="cryptocurrency-color:btc" width={24} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-neutral-900 font-sans">BTC $200k Market</p>
                    <p className="text-xs text-neutral-400 font-sans">Position: <span className="text-yellow-600">Hidden</span></p>
                  </div>
                </div>
                <Icon icon="solar:lock-linear" width={18} className="text-yellow-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
