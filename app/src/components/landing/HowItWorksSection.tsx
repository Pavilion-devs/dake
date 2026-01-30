"use client";

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="overflow-hidden min-h-[800px] flex relative items-center w-full">
      {/* Background Image & Gradient */}
      <div className="absolute top-0 right-0 bottom-0 left-0">
        <img
          src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/29b6f8c1-4665-4c13-974e-fa495d462bb4_1600w.webp"
          className="w-full h-full object-cover object-center"
          alt="Privacy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 via-purple-700/60 to-transparent mix-blend-multiply"></div>
        <div className="bg-gradient-to-t from-purple-900/50 to-transparent absolute top-0 right-0 bottom-0 left-0"></div>
      </div>

      <div className="z-10 px-6 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-12 w-full relative gap-x-12 gap-y-12 max-w-7xl mx-auto">
        <div className="space-y-8">
          <div className="animate-in-delay-1">
            <span className="inline-block px-4 py-1 rounded-full border border-white/30 text-white text-sm font-sans mb-4">
              How It Works
            </span>
            <h2 className="text-5xl lg:text-7xl text-white tracking-tight leading-[1.1] font-dm-sans font-light">
              Privacy-first predictions.
            </h2>
            <p className="text-white/80 text-xl max-w-md font-sans mt-4">
              Bet on outcomes without revealing your position. Powered by fully homomorphic encryption.
            </p>
          </div>

          {/* Steps */}
          <div className="flex flex-wrap gap-4 pt-8 animate-in-delay-3">
            <div className="bg-yellow-400/90 backdrop-blur-md p-6 rounded-3xl w-44 text-neutral-900">
              <h4 className="text-3xl tracking-tight font-dm-sans font-light">01</h4>
              <p className="text-sm font-medium leading-tight mt-2 font-sans">Connect wallet & browse markets</p>
            </div>
            <div className="bg-green-400/90 backdrop-blur-md p-6 rounded-3xl w-44 text-neutral-900">
              <h4 className="text-3xl tracking-tight font-dm-sans font-light">02</h4>
              <p className="text-sm font-medium leading-tight mt-2 font-sans">Place encrypted YES/NO bet</p>
            </div>
            <div className="bg-purple-300/90 backdrop-blur-md p-6 rounded-3xl w-44 text-purple-900">
              <h4 className="text-3xl tracking-tight font-dm-sans font-light">03</h4>
              <p className="text-sm font-medium leading-tight mt-2 font-sans">Claim winnings privately</p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Progress Bar Indicator */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-white/30 rounded-full overflow-hidden animate-in-delay-7">
        <div className="w-2/3 h-full bg-white rounded-full"></div>
      </div>
    </section>
  );
}
