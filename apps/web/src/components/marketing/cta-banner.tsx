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
        <div className="relative rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
            {/* Image with corner accents */}
            <div className="relative hidden shrink-0 sm:block">
              <div className="absolute -left-3 -top-3 h-12 w-12 bg-accent" aria-hidden="true" />
              <div className="absolute -bottom-3 right-0 h-12 w-12 bg-foreground" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/demo/redesign/hero-after-boho.webp"
                alt="Room redesign preview"
                className="relative h-40 w-60 rounded-xl border border-border object-cover"
              />
            </div>

            <div>
              <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
                Your next room redesign
                <br />
                is just a <span className="text-foreground">photo away.</span>
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
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
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-64"
                />
                <button
                  type="submit"
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <span>Get started free</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Free plan · No card required</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
