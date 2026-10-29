"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CtaBanner() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      router.push(`/sign-up?email=${encodeURIComponent(email)}`);
    } else {
      router.push("/sign-up");
    }
  };

  return (
    <section className="px-4 pb-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#1d382b] text-white shadow-2xl">
        {/* Subtle background glow & texture */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#173024] via-[#214333] to-[#1a3a2c] opacity-90" />
        
        <div className="relative z-10 flex flex-col items-center justify-between gap-8 p-8 sm:p-12 lg:flex-row">
          <div className="flex items-center gap-6">
            <div className="relative hidden h-24 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-md sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/demo/hero-after-modern.jpg"
                alt="Room redesign preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Your next room redesign is just a photo away.
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-emerald-100/80">
                Join 28,500+ users and start visualizing beautiful spaces today.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-md shrink-0">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-emerald-600/40 bg-white/10 px-4 py-3 text-xs text-white placeholder-emerald-200/60 backdrop-blur-sm focus:border-white focus:bg-white/20 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-[#48a068] px-5 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#3d8c5a] active:scale-95 transition-all"
              >
                Get started free →
              </button>
            </div>
            <p className="mt-2 text-center sm:text-left text-[11px] text-emerald-200/70">
              Free plan · No card required
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
