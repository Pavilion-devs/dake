"use client";

export default function CommunitySection() {
  return (
    <section id="community" className="p-6 lg:p-16 overflow-hidden bg-black border-white/10 border-y relative w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 z-10 relative gap-x-12 gap-y-12 items-center max-w-7xl mx-auto">
        <div className="space-y-6 animate-in-delay-1">
          <h2 className="text-4xl lg:text-6xl text-[#FACC15] tracking-tight leading-tight font-dm-sans font-light">
            Join the prediction revolution.
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-lg font-sans">
            Dake is building the future of prediction markets — where your insights stay private and your edge stays yours.
            Join thousands betting smarter, not louder.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              className="bg-[#FACC15] text-neutral-900 px-8 py-4 rounded-full text-base font-medium hover:bg-yellow-300 transition-colors font-sans"
            >
              Follow on X
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              className="border border-white/20 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-white/5 transition-colors font-sans"
            >
              Join Discord
            </a>
          </div>
        </div>

        {/* Vertical Pill Images */}
        <div
          className="flex gap-4 lg:justify-end overflow-hidden h-[500px] gap-x-4 gap-y-4 justify-center"
          style={{
            maskImage: "linear-gradient(180deg, transparent, black 10%, black 100%, transparent)",
            WebkitMaskImage: "linear-gradient(180deg, transparent, black 10%, black 100%, transparent)",
          }}
        >
          <div className="flex flex-col -mt-12 gap-x-4 gap-y-4 animate-in-long">
            <img
              src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/1cbabc55-9b50-45a8-9909-62a2bf7195c4_800w.webp"
              className="opacity-80 w-24 h-64 object-cover rounded-full"
              alt="Community Member"
            />
            <img
              src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/ef7dac00-17d0-424e-b869-197b59fd733e_800w.webp"
              className="opacity-60 w-24 h-64 object-cover rounded-full"
              alt="Community Member"
            />
          </div>
          <div className="flex flex-col gap-4 mt-8 gap-x-4 gap-y-4 animate-in-long-delay-1">
            <img
              src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/b7a515a9-1c73-4810-ba0c-bc08f0a90d61_800w.webp"
              className="w-24 h-64 object-cover rounded-full"
              alt="Community Member"
            />
            <img
              src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/2d73cdc2-d0a6-4758-8bd2-bfa826c8c51d_800w.webp"
              className="w-24 h-64 object-cover rounded-full"
              alt="Community Member"
            />
          </div>
          <div className="flex flex-col -mt-4 gap-x-4 gap-y-4 animate-in-long-delay-2">
            <img
              src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/b3150e38-5fe9-4f65-a962-053812f57b03_800w.webp"
              className="opacity-90 w-24 h-64 object-cover rounded-full"
              alt="Community Member"
            />
            <img
              src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/8790ab5d-f909-40f7-a522-c484c8a1bf40_320w.webp"
              className="w-24 h-64 object-cover rounded-full"
              alt="Community Member"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
