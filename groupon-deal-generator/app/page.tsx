"use client";

import { useState, useRef } from "react";

interface DealProgress {
  headline: string;
  subheader: string;
  company: string;
  dealBullets: string[];
  finePrint: string[];
}

type Phase = "idle" | "streaming" | "done" | "error";

const EMPTY: DealProgress = {
  headline: "",
  subheader: "",
  company: "",
  dealBullets: [],
  finePrint: [],
};

const CATEGORIES = [
  "Food & Drink",
  "Beauty & Spa",
  "Health & Fitness",
  "Activities & Fun",
  "Automotive",
  "Home Services",
  "Travel",
  "Education & Classes",
];

function Cursor() {
  return (
    <span className="animate-blink inline-block h-4 w-0.5 bg-groupon align-middle ml-0.5" />
  );
}

function SavingsBadge({
  originalPrice,
  dealPrice,
}: {
  originalPrice: string;
  dealPrice: string;
}) {
  const orig = parseFloat(originalPrice);
  const deal = parseFloat(dealPrice);
  if (!orig || !deal || deal >= orig) return null;
  const savings = (orig - deal).toFixed(2);
  const pct = Math.round(((orig - deal) / orig) * 100);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-groupon-light border border-groupon/20">
      <div className="text-2xl font-extrabold text-groupon">{pct}% off</div>
      <div className="text-sm text-slate-600">
        Save <span className="font-semibold text-slate-800">${savings}</span> — pay{" "}
        <span className="font-semibold text-slate-800">${deal.toFixed(2)}</span>{" "}
        instead of{" "}
        <span className="line-through text-slate-400">${orig.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState({
    businessName: "Serenity Day Spa",
    category: "Beauty & Spa",
    location: "Chicago, IL",
    offerSummary: "60-Minute Swedish or Deep-Tissue Massage",
    originalPrice: "89",
    dealPrice: "45",
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<DealProgress>(EMPTY);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const set =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  function processLine(line: string, draft: DealProgress): DealProgress {
    if (line.startsWith("HEADLINE:"))
      return { ...draft, headline: line.slice(9).trim() };
    if (line.startsWith("SUBHEADER:"))
      return { ...draft, subheader: line.slice(10).trim() };
    if (line.startsWith("COMPANY:"))
      return { ...draft, company: line.slice(8).trim() };
    if (line.startsWith("BULLET:"))
      return {
        ...draft,
        dealBullets: [...draft.dealBullets, line.slice(7).trim()],
      };
    if (line.startsWith("FINE:"))
      return {
        ...draft,
        finePrint: [...draft.finePrint, line.slice(5).trim()],
      };
    return draft;
  }

  async function handleGenerate() {
    setPhase("streaming");
    setProgress(EMPTY);
    setError("");
    setCopied(false);
    setTimeout(
      () =>
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      100
    );

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setPhase("error");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let draft = EMPTY;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (t) {
            draft = processLine(t, draft);
            setProgress({ ...draft });
          }
        }
      }

      if (buffer.trim()) {
        draft = processLine(buffer.trim(), draft);
        setProgress({ ...draft });
      }

      setPhase("done");
    } catch {
      setError("Failed to generate. Please try again.");
      setPhase("error");
    }
  }

  function formatForClipboard(p: DealProgress): string {
    const lines: string[] = [];
    if (p.headline) lines.push(p.headline);
    if (p.subheader) lines.push(p.subheader);
    if (p.company) lines.push("\n" + p.company);
    if (p.dealBullets.length) {
      lines.push("\nWhat's Included:");
      p.dealBullets.forEach((b) => lines.push("• " + b));
    }
    if (p.finePrint.length) {
      lines.push("\nFine Print:");
      p.finePrint.forEach((f) => lines.push("• " + f));
    }
    return lines.join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(formatForClipboard(progress));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isStreaming = phase === "streaming";
  const isDone = phase === "done";

  const orig = parseFloat(form.originalPrice);
  const deal = parseFloat(form.dealPrice);
  const pct =
    orig > 0 && deal > 0 && deal < orig
      ? Math.round(((orig - deal) / orig) * 100)
      : null;

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white px-6 pt-14 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-groupon/20 border border-groupon/40 text-groupon text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
          <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-groupon inline-block" />
          AI-Powered · Streams Live
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          Groupon Deal Generator
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed mb-8">
          Enter your deal details and watch Claude write professional Groupon
          copy in real time — headline, bullets, fine print and all.
        </p>

        {/* Feature chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {["Streaming output", "Claude Sonnet 4.6", "Next.js App Router"].map((label) => (
            <span
              key={label}
              className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium"
            >
              {label}
            </span>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12 flex gap-8 items-start justify-center">

        {/* ── Attribution sidebar ───────────────────────────── */}
        <aside className="hidden xl:block w-48 flex-shrink-0 sticky top-8">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="h-1 bg-groupon" />
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest leading-5 font-bold">
                  Proof-of-work
                </p>
                <p className="text-xs text-slate-400 uppercase tracking-widest leading-5 font-bold">
                  Groupon AI Builder
                </p>
              </div>
              <p className="font-semibold text-slate-800 text-sm">Kyle Cardwell</p>
              <div className="space-y-2.5 pt-1 border-t border-slate-100">
                <a
                  href="https://github.com/kecardwe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-xs transition-colors"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  kecardwe
                </a>
                <a
                  href="https://www.linkedin.com/in/kyle-e-cardwell/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-xs transition-colors"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 .774v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Kyle Cardwell
                </a>
                <a
                  href="mailto:cardwellkyle4674@gmail.com"
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-xs transition-colors"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M2 7l10 7 10-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="break-all">cardwellkyle4674@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </aside>

        <main className="w-full max-w-2xl min-w-0 space-y-10">
        {/* ── Form Card ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="h-1 bg-groupon" />
          <div className="p-8 space-y-5">
            <h2 className="text-lg font-semibold text-slate-800">
              Deal Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Business Name
                </label>
                <input
                  value={form.businessName}
                  onChange={set("businessName")}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-groupon/40 focus:border-groupon transition"
                  placeholder="e.g. Serenity Day Spa"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={set("category")}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-groupon/40 focus:border-groupon transition bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Location
                </label>
                <input
                  value={form.location}
                  onChange={set("location")}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-groupon/40 focus:border-groupon transition"
                  placeholder="e.g. Chicago, IL"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Offer Summary
                </label>
                <textarea
                  value={form.offerSummary}
                  onChange={set("offerSummary")}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-groupon/40 focus:border-groupon transition resize-none"
                  placeholder="e.g. 60-Minute Deep-Tissue Massage"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Original Price ($)
                </label>
                <input
                  value={form.originalPrice}
                  onChange={set("originalPrice")}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-groupon/40 focus:border-groupon transition"
                  placeholder="89.00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Deal Price ($)
                </label>
                <input
                  value={form.dealPrice}
                  onChange={set("dealPrice")}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-groupon/40 focus:border-groupon transition"
                  placeholder="45.00"
                />
              </div>

              <div className="col-span-2">
                <SavingsBadge
                  originalPrice={form.originalPrice}
                  dealPrice={form.dealPrice}
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isStreaming}
              className="w-full bg-groupon hover:bg-groupon-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-groupon/50 focus:ring-offset-2"
            >
              {isStreaming ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                    />
                  </svg>
                  Generating…
                </span>
              ) : isDone ? (
                "Regenerate Description"
              ) : (
                "Generate Description"
              )}
            </button>
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────── */}
        {phase === "error" && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* ── Output Card ───────────────────────────────────── */}
        {(isStreaming || isDone) && (
          <div
            ref={outputRef}
            className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden animate-fade-in"
          >
            {/* Dark banner */}
            <div className="bg-slate-900 text-white px-8 py-7">
              {pct !== null && (
                <div className="text-6xl font-extrabold text-groupon leading-none">
                  {pct}% off
                </div>
              )}
              <div className="flex items-baseline gap-3 mt-1">
                {deal > 0 && (
                  <span className="text-3xl font-bold">
                    ${deal.toFixed(2)}
                  </span>
                )}
                {orig > 0 && (
                  <span className="text-slate-400 line-through text-lg">
                    ${orig.toFixed(2)}
                  </span>
                )}
              </div>

              {progress.headline ? (
                <h2 className="mt-4 text-xl font-bold leading-snug">
                  {progress.headline}
                  {isStreaming && !progress.subheader && <Cursor />}
                </h2>
              ) : (
                isStreaming && (
                  <div className="mt-4 h-7 flex items-center">
                    <Cursor />
                  </div>
                )
              )}

              {progress.subheader && (
                <p className="mt-2 text-slate-300 text-sm leading-relaxed animate-fade-in">
                  {progress.subheader}
                  {isStreaming && !progress.company && <Cursor />}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-6">
              {/* The Company */}
              {progress.company && (
                <div className="animate-slide-up">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                    The Company
                  </p>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {progress.company}
                    {isStreaming && !progress.dealBullets.length && <Cursor />}
                  </p>
                </div>
              )}

              {/* What's Included */}
              {progress.dealBullets.length > 0 && (
                <div className="animate-slide-up">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                    What&apos;s Included
                  </p>
                  <ul className="space-y-2">
                    {progress.dealBullets.map((b, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm text-slate-700 animate-fade-in"
                      >
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-groupon-light flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-groupon"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6.5L4.5 9 10 3"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        {b}
                      </li>
                    ))}
                    {isStreaming && !progress.finePrint.length && <Cursor />}
                  </ul>
                </div>
              )}

              {/* Fine Print */}
              {progress.finePrint.length > 0 && (
                <div className="animate-slide-up pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                    Fine Print
                  </p>
                  <ul className="space-y-1.5">
                    {progress.finePrint.map((f, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-xs text-slate-500 animate-fade-in"
                      >
                        <span className="mt-0.5 text-slate-300 flex-shrink-0">
                          •
                        </span>
                        {f}
                      </li>
                    ))}
                    {isStreaming && <Cursor />}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {isDone && (
                <div className="flex gap-3 pt-2 border-t border-slate-100 animate-fade-in">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-groupon/30"
                  >
                    {copied ? (
                      <>
                        <svg
                          className="w-4 h-4 text-groupon"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3 8l3.5 3.5L13 4"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <rect
                            x="5"
                            y="5"
                            width="8"
                            height="9"
                            rx="1.5"
                            stroke="currentColor"
                            strokeWidth="1.25"
                          />
                          <path
                            d="M5 5V4a1.5 1.5 0 00-1.5-1.5H4A1.5 1.5 0 002.5 4v7A1.5 1.5 0 004 12.5h1"
                            stroke="currentColor"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                          />
                        </svg>
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-groupon text-white text-sm font-medium hover:bg-groupon-dark transition-colors focus:outline-none focus:ring-2 focus:ring-groupon/50"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M13.5 8A5.5 5.5 0 112.5 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M13.5 4v4h-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idle hint */}
        {phase === "idle" && (
          <p className="text-center text-slate-400 text-sm">
            Fill in the details above and click{" "}
            <strong className="text-slate-600">Generate Description</strong> to
            see the magic.
          </p>
        )}
        </main>

        {/* Spacer mirrors the aside width so the main column stays centered */}
        <div className="hidden xl:block w-48 flex-shrink-0" />
      </div>

      <footer className="text-center text-xs text-slate-400 py-8">
        Built with Claude Sonnet 4.6 · Anthropic AI
      </footer>
    </div>
  );
}
