"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function AppNavbar() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <nav className="flex z-20 border-b border-white/10 py-4 px-6 lg:px-8 relative items-center justify-between bg-[#0f0f11]/80 backdrop-blur-md sticky top-0">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Icon icon="solar:eye-scan-linear" width={28} className="text-[#FACC15]" />
          <span className="text-xl font-semibold text-white font-dm-sans">Dake</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/markets"
            className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            Markets
          </Link>
          <Link
            href="/portfolio"
            className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            Portfolio
          </Link>
        </div>
      </div>

      {/* Wallet Connection */}
      <div className="flex items-center gap-4">
        {connected && publicKey ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-white font-medium">
                {shortenAddress(publicKey.toBase58())}
              </span>
            </div>
            <button
              onClick={() => disconnect()}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <Icon icon="solar:logout-2-outline" width={20} className="text-slate-400" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setVisible(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FACC15] text-neutral-900 rounded-full font-medium text-sm hover:bg-[#FACC15]/90 transition-all"
          >
            <Icon icon="solar:wallet-outline" width={18} />
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
