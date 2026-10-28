import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
        Redesign your room before you spend a dollar
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
        Upload a photo of your room, pick a style, and see concept visuals and a budgeted plan.
        For homeowners and design professionals.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/sign-up"
          className="w-full rounded-md bg-slate-900 px-6 py-3 text-center font-medium text-white hover:bg-slate-800 sm:w-auto"
        >
          Design my room
        </Link>
        <Link
          href="/sign-up"
          className="w-full rounded-md border border-slate-300 px-6 py-3 text-center font-medium text-slate-800 hover:bg-slate-50 sm:w-auto"
        >
          I&apos;m a design professional
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Concept visuals only — not exact dimensions, prices or binding quotes.
      </p>
    </div>
  );
}
