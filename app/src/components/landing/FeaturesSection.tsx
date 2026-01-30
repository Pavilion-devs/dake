"use client";

import { Icon } from "@iconify/react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 lg:px-8 w-full">
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 animate-in-delay-1">
        <span className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-400 font-sans">
          Core Features
        </span>
        <h2 className="text-4xl lg:text-5xl text-white tracking-tight leading-tight font-dm-sans font-light">
          Prediction markets, reimagined with privacy.
        </h2>
        <p className="text-slate-400 font-sans">Your bets stay encrypted. Your edge stays yours.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Card 1 - Encrypted Positions */}
        <div className="bg-[#FACC15] p-8 rounded-[2rem] text-neutral-900 flex flex-col justify-between min-h-[400px] animate-in-delay-2">
          <div>
            <div className="flex justify-between items-start mb-6">
              <Icon icon="solar:lock-keyhole-linear" width={48} />
              <div className="w-10 h-10 bg-neutral-900 rounded-full"></div>
            </div>
            <h3 className="text-2xl mb-3 tracking-tight font-dm-sans font-light">Encrypted Positions</h3>
            <p className="text-neutral-800 leading-relaxed text-base font-sans">
              Your bet side (YES/NO) is encrypted on-chain using Inco Lightning. Nobody can see which way you're betting — not even validators.
            </p>
          </div>
          <div className="flex gap-1 mt-8">
            <div className="w-8 h-8 rounded-full border-2 border-neutral-900 flex items-center justify-center">
              <Icon icon="solar:eye-closed-linear" width={16} />
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-neutral-900/20"></div>
          </div>
        </div>

        {/* Card 2 - No Copy Trading */}
        <div className="bg-white p-8 rounded-[2rem] text-neutral-900 flex flex-col justify-between min-h-[400px] animate-in-delay-3">
          <div>
            <div className="flex justify-between items-start mb-6">
              <Icon icon="solar:users-group-rounded-linear" width={48} />
              <div className="w-10 h-10 bg-neutral-900 rounded-full"></div>
            </div>
            <h3 className="text-2xl mb-3 tracking-tight font-dm-sans font-light">No Copy Trading</h3>
            <p className="text-neutral-600 leading-relaxed text-base font-sans">
              Whales can't be front-run. Your alpha stays private. No more watching your edge disappear as others copy your positions.
            </p>
          </div>
          <div className="flex gap-[-8px] mt-8">
            <div className="flex items-center gap-1 bg-neutral-100 rounded-full p-1 pr-4">
              <div className="w-6 h-6 bg-black rounded-full text-white flex items-center justify-center text-xs font-sans">
                <Icon icon="solar:shield-check-linear" width={14} />
              </div>
              <span className="text-xs font-semibold font-sans">Protected</span>
            </div>
          </div>
        </div>

        {/* Card 3 - AI Insights */}
        <div className="bg-[#4ADE80] p-8 rounded-[2rem] text-neutral-900 flex flex-col justify-between min-h-[400px] animate-in-delay-4">
          <div>
            <div className="flex justify-between items-start mb-6">
              <Icon icon="solar:magic-stick-3-linear" width={48} />
              <div className="w-10 h-10 bg-neutral-900 rounded-full"></div>
            </div>
            <h3 className="text-2xl mb-3 tracking-tight font-dm-sans font-light">Dake AI Insights</h3>
            <p className="text-neutral-800 leading-relaxed text-base font-sans">
              Get AI-powered analysis for every market. Dake AI analyzes news, sentiment, and data to help you make informed predictions.
            </p>
          </div>
          <div className="mt-8">
            <Icon icon="solar:stars-minimalistic-linear" width={32} className="text-neutral-900" />
          </div>
        </div>
      </div>
    </section>
  );
}
