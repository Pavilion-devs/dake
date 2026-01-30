"use client";

import { Icon } from "@iconify/react";
import Navbar from "./Navbar";
import Link from "next/link";

export default function HeroSection() {
  return (
    <header className="overflow-hidden min-h-[90vh] flex flex-col text-neutral-900 bg-[#FACC15] relative w-full">
      <Navbar />

      {/* Hero Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 z-20 pt-12 pb-24 px-6 lg:px-8 relative gap-x-12 gap-y-12 items-center">
        <div className="space-y-8 max-w-xl">
          <h1 className="lg:text-7xl leading-[1.1] text-5xl tracking-tight font-dm-sans font-light animate-in-delay-1">
            Predict the future. Keep it private.
          </h1>
          <p className="text-xl text-neutral-800 max-w-md leading-relaxed font-sans animate-in-delay-2">
            The first confidential prediction market on Solana. Your bets are encrypted — nobody knows your position until you win.
          </p>
          <div className="flex flex-wrap gap-4 pt-4 animate-in-delay-3">
            <Link
              href="/markets"
              className="hover:bg-neutral-800 transition-colors text-base font-medium text-white bg-neutral-900 rounded-full px-8 py-4 shadow-xl"
            >
              Start Predicting
            </Link>
            <button className="border border-neutral-900/20 px-8 py-4 rounded-full text-base font-medium hover:bg-white/20 transition-colors flex items-center gap-2 font-sans">
              How it Works <Icon icon="solar:arrow-right-up-linear" />
            </button>
          </div>
        </div>

        {/* Hero Image & Floating Card */}
        <div className="min-h-[500px] flex lg:justify-end w-full h-full relative items-center justify-center animate-in-delay-4">
          {/* Background Image Mask */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden mix-blend-multiply opacity-90">
            <img
              src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/496075b4-61b8-49d2-b69f-b1d4da70d9c3_1600w.webp"
              alt="Prediction Markets"
              className="object-top grayscale-[20%] sepia-[30%] w-full h-full object-cover"
            />
          </div>

          {/* Floating UI Card - Prediction Market Preview */}
          <div className="text-white bg-neutral-900 w-80 border-white/10 border rounded-[2rem] lg:mr-8 p-8 relative shadow-2xl backdrop-blur-sm animate-in-delay-6">
            <div className="flex justify-between items-start mb-6">
              <Icon icon="solar:chart-2-linear" className="text-yellow-400" width={28} />
              <span className="bg-green-400/10 text-green-400 px-3 py-1 rounded-full text-sm font-medium font-sans">Live</span>
            </div>
            <div className="space-y-1 mb-6">
              <p className="text-sm text-neutral-400 font-sans">Active Market</p>
              <h3 className="text-lg tracking-tight font-dm-sans font-light">Will SOL hit $500 by March 2026?</h3>
            </div>
            <div className="flex gap-3 mb-6">
              <div className="flex-1 bg-green-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-green-400 font-sans">YES</p>
                <p className="text-lg font-dm-sans text-green-400">42%</p>
              </div>
              <div className="flex-1 bg-red-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-red-400 font-sans">NO</p>
                <p className="text-lg font-dm-sans text-red-400">58%</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 font-sans">Your position: <span className="text-yellow-400">Hidden</span></span>
              <Icon icon="solar:lock-linear" className="text-yellow-400" width={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Logo Strip - Built on Solana */}
      <div className="relative z-20 bg-black/90 py-6 mt-auto">
        <div className="flex flex-wrap justify-center items-center gap-12 px-6 opacity-80 animate-in-delay-7">
          <span className="text-white/60 text-sm font-sans">Powered by</span>
          <Icon icon="cryptocurrency-color:sol" width={32} height={32} />
          <span className="text-white font-medium font-sans">Solana</span>
          <span className="text-white/40">|</span>
          <span className="text-white/60 text-sm font-sans">Encrypted by</span>
          <Icon icon="solar:shield-check-bold" width={28} height={28} className="text-purple-400" />
          <span className="text-white font-medium font-sans">Inco Lightning</span>
        </div>
      </div>
    </header>
  );
}
