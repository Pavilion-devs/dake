"use client";

export default function VerticalLines() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 mx-auto max-w-[90rem] justify-between px-8 opacity-[0.08] hidden lg:flex left-1/2 -translate-x-1/2">
      <div className="w-px h-full bg-slate-100"></div>
      <div className="w-px h-full bg-slate-100"></div>
      <div className="w-px h-full bg-slate-100"></div>
      <div className="w-px h-full bg-slate-100"></div>
    </div>
  );
}
