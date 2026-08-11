import { useEffect, useState } from "react";
import { PLATFORM_NAME } from "@/lib/brand";

const STORAGE_KEY = "asi-nexus.splash.cycle";

interface SplashCycle {
  /** Visits in the current 2-refresh window (0..1). */
  index: number;
  /** Whether the splash already showed in this window. */
  shown: boolean;
}

function readCycle(): SplashCycle {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { index: 0, shown: false };
    const parsed = JSON.parse(raw) as SplashCycle;
    if (
      typeof parsed.index !== "number" ||
      typeof parsed.shown !== "boolean" ||
      parsed.index < 0 ||
      parsed.index > 1
    ) {
      return { index: 0, shown: false };
    }
    return parsed;
  } catch {
    return { index: 0, shown: false };
  }
}

function writeCycle(cycle: SplashCycle) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cycle));
}

/**
 * Across any 2 refreshes in a tab, show at least once and not every time when avoidable.
 */
function computeSplashDecision(): boolean {
  const cycle = readCycle();
  const index = cycle.index;
  const show = index === 0 ? Math.random() < 0.5 : !cycle.shown;

  const nextIndex = (index + 1) % 2;
  writeCycle({
    index: nextIndex,
    shown: nextIndex === 0 ? false : cycle.shown || show,
  });

  return show;
}

/** Survives React Strict Mode double-mount in the same page load. */
let decisionForThisLoad: boolean | null = null;

function getSplashDecision(): boolean {
  if (typeof window === "undefined") return false;
  if (decisionForThisLoad !== null) return decisionForThisLoad;
  decisionForThisLoad = computeSplashDecision();
  return decisionForThisLoad;
}

const INTRO_MS = 280;
const HOLD_MS = 1800;
const REVEAL_MS = 2200;
const FADE_MS = 700;

export function BrandSplash() {
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!getSplashDecision()) return;

    setActive(true);
    const revealTimer = window.setTimeout(() => setRevealed(true), INTRO_MS);
    const exitTimer = window.setTimeout(
      () => setExiting(true),
      INTRO_MS + REVEAL_MS + HOLD_MS,
    );
    const doneTimer = window.setTimeout(
      () => setActive(false),
      INTRO_MS + REVEAL_MS + HOLD_MS + FADE_MS,
    );

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity ease-out ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden
      role="presentation"
    >
      <div
        className="overflow-hidden transition-[max-width] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          maxWidth: revealed ? "36rem" : "0.65rem",
          transitionDuration: `${REVEAL_MS}ms`,
        }}
      >
        <div className="flex w-[min(92vw,36rem)] flex-col items-center gap-4 px-6 text-center">
          <img
            src="/asisa-logo.png"
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-contain sm:h-20 sm:w-20"
          />
          <p className="font-display text-base font-semibold leading-snug tracking-tight text-evergreen sm:text-lg">
            {PLATFORM_NAME}
          </p>
        </div>
      </div>
    </div>
  );
}
