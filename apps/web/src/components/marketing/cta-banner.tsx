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
      <div className="mx-auto max-w-6xl">
        <div className="relative border border-black bg-white p-6 shadow-[10px_10px_0_0_#000] sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
            {/* Image with corner accents */}
            <div className="relative hidden shrink-0 sm:block">
              <div className="absolute -left-3 -top-3 h-12 w-12 bg-[#FFD400]" aria-hidden="true" />
              <div className="absolute -bottom-3 right-0 h-12 w-12 bg-[#1f4fff]" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/demo/homeowner-feature.jpg"
                alt="Room redesign preview"
                className="relative h-40 w-60 border border-black object-cover"
              />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-black sm:text-4xl">
                Your next room redesign
                <br />
                is just a <span className="text-[#1f4fff]">photo away.</span>
              </h2>
              <p className="mt-3 text-sm text-black/70">
                Join 28,500+ users and start visualizing beautiful spaces today.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full shrink-0 lg:w-auto">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-black bg-white px-4 py-3 text-sm text-black placeholder-black/40 focus:outline-none focus:ring-1 focus:ring-black sm:w-64"
                />
                <button
                  type="submit"
                  className="flex shrink-0 items-center justify-center gap-2 border border-black bg-[#FFD400] px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-black shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                >
                  <span>Get started free</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              <p className="mt-2 text-[11px] text-black/60">Free plan · No card required</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
