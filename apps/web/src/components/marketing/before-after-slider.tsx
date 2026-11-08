"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: string;
  enableScrollEffect?: boolean;
  variant?: "default" | "block";
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeAlt = "Room before redesign",
  afterAlt = "AI concept visual redesign",
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
  aspectRatio = "aspect-[4/3]",
  enableScrollEffect = true,
  variant = "default",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate position from mouse or touch event
  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
    setUserInteracted(true);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches[0]) {
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, updatePosition]);

  // Scroll effect: As user scrolls through the element, smoothly slide from 20% to 75%
  useEffect(() => {
    if (!enableScrollEffect || userInteracted) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking || userInteracted) return;
      window.requestAnimationFrame(() => {
        if (!containerRef.current || userInteracted) {
          ticking = false;
          return;
        }
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // When element enters from bottom to when it reaches top third
        if (rect.top < windowHeight && rect.bottom > 0) {
          const progress = Math.max(
            0,
            Math.min(1, (windowHeight - rect.top) / (windowHeight + rect.height * 0.5)),
          );
          // Smooth glide from 25% (mostly before/messy) to 75% (revealing AI magic)
          const target = 25 + progress * 50;
          setSliderPosition(target);
        }
        ticking = false;
      });
      ticking = true;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial calculation in case already in viewport
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enableScrollEffect, userInteracted]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setUserInteracted(true);
    if (e.key === "ArrowLeft") {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === "ArrowRight") {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden bg-neutral-900 cursor-ew-resize group ${variant === "block" ? "rounded-none" : "rounded-2xl shadow-xl"} ${aspectRatio} ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-label="Before and after transformation slider"
      aria-valuenow={Math.round(sliderPosition)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
    >
      {/* Background (After / AI Magic Image) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterImage}
        alt={afterAlt}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      />

      {/* Foreground (Before / Messy Image), clipped to sliderPosition */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeImage}
          alt={beforeAlt}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        />
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 pointer-events-none z-10">
        {variant === "block" ? (
          <span className="bg-foreground px-3 py-1 text-[11px] font-semibold tracking-normal text-white">
            {beforeLabel}
          </span>
        ) : (
          <span className="rounded-full bg-foreground/60 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white/90 shadow-sm border border-white/10 uppercase tracking-wider">
            {beforeLabel}
          </span>
        )}
      </div>
      <div className="absolute top-3 right-3 pointer-events-none z-10">
        {variant === "block" ? (
          <span className="rounded-xl border border-border bg-accent px-3 py-1 text-[11px] font-semibold tracking-normal text-foreground">
            {afterLabel}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-950/80 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-emerald-200 shadow-sm border border-emerald-500/30 uppercase tracking-wider">
            {afterLabel}
          </span>
        )}
      </div>

      {/* Divider Line & Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-card/90 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none transition-opacity"
        style={{ left: `${sliderPosition}%` }}
      >
        {variant === "block" ? (
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-accent text-foreground">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
              <polyline points="9 18 3 12 9 6" />
            </svg>
            <div className="mx-0.5 h-3 w-px bg-foreground/50" />
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
              <polyline points="15 18 21 12 15 6" />
            </svg>
          </div>
        ) : (
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-xl rounded-xl border border-border transition-transform group-hover:scale-105 active:scale-95">
            <svg
              className="h-4 w-4 text-emerald-950"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
              <polyline points="9 18 3 12 9 6" />
            </svg>
            <div className="h-3 w-px bg-neutral-300 mx-0.5" />
            <svg
              className="h-4 w-4 text-emerald-950"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
              <polyline points="15 18 21 12 15 6" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
