"use client";

import { Icon } from "@iconify/react";

export default function Footer() {
  return (
    <footer className="relative mt-32 lg:mt-24">
      {/* Footer Main */}
      <div className="bg-gradient-to-b from-[#1a1a1a] to-[#2d2f20] pt-24 pb-12 px-6 lg:px-16 border-t border-white/5 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 max-w-7xl mx-auto">
          <div className="lg:col-span-2 space-y-6 animate-in-delay-1">
            <div className="flex items-center gap-2 text-white">
              <Icon icon="solar:eye-scan-linear" width={24} className="text-yellow-400" />
              <span className="text-lg font-semibold tracking-tight font-sans">Dake</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm font-sans">
              The first confidential prediction market on Solana. Bet on outcomes without revealing your position.
              Powered by Inco Lightning's fully homomorphic encryption.
            </p>
            <div className="flex gap-4">
              <a href="https://twitter.com" target="_blank" className="bg-white/5 hover:bg-white/10 p-2 rounded-full text-yellow-400 transition-colors">
                <Icon icon="simple-icons:x" width={18} />
              </a>
              <a href="https://discord.com" target="_blank" className="bg-white/5 hover:bg-white/10 p-2 rounded-full text-yellow-400 transition-colors">
                <Icon icon="simple-icons:discord" width={18} />
              </a>
              <a href="https://github.com" target="_blank" className="bg-white/5 hover:bg-white/10 p-2 rounded-full text-yellow-400 transition-colors">
                <Icon icon="simple-icons:github" width={18} />
              </a>
            </div>
          </div>

          <div className="animate-in-delay-2">
            <h4 className="text-white font-medium mb-6 text-sm font-sans">Product</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="/markets" className="hover:text-yellow-400 transition-colors font-sans">
                  Markets
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-yellow-400 transition-colors font-sans">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-yellow-400 transition-colors font-sans">
                  How it Works
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  Dake AI
                </a>
              </li>
            </ul>
          </div>

          <div className="animate-in-delay-3">
            <h4 className="text-white font-medium mb-6 text-sm font-sans">Developers</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  Smart Contracts
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          <div className="animate-in-delay-4">
            <h4 className="text-yellow-400 font-medium mb-6 text-sm font-sans">Resources</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition-colors font-sans">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 animate-in-delay-5 max-w-7xl mx-auto">
          <p className="font-sans">© 2026 Dake. Built for the Inco Bounty.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span className="font-sans flex items-center gap-2">
              <Icon icon="cryptocurrency-color:sol" width={16} />
              Solana Devnet
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
