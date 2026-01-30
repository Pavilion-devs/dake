"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex z-20 border-black/10 border-b lg:border py-6 px-6 lg:px-8 relative items-center justify-between animate-in">
      <div className="flex items-center gap-2">
        <Icon icon="solar:eye-scan-linear" width={28} className="text-neutral-900" />
        <span className="text-xl font-semibold tracking-tight font-sans">Dake</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-base font-medium text-neutral-800">
        <a href="#features" className="hover:text-black transition-colors font-sans">Features</a>
        <a href="#how-it-works" className="hover:text-black transition-colors font-sans">How it Works</a>
        <a href="#community" className="hover:text-black transition-colors font-sans">Community</a>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/markets"
          className="bg-neutral-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors font-sans"
        >
          Launch App
        </Link>
      </div>
    </nav>
  );
}
