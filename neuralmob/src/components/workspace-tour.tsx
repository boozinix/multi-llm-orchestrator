"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { AppIcon } from "@/components/app-icon";

export type WorkspaceTourStep = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  detail?: string;
  bullets?: string[];
  selector?: string;
  mobileSelector?: string;
  mobileTab?: "chat" | "flow";
};

type WorkspaceTourProps = {
  open: boolean;
  stepIndex: number;
  steps: WorkspaceTourStep[];
  onStepChange: (index: number) => void;
  onClose: (reason: "dismissed" | "completed") => void;
};

export function WorkspaceTour({
  open,
  stepIndex,
  steps,
  onStepChange,
  onClose,
}: WorkspaceTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = steps[stepIndex] ?? steps[0];
  const isOverview = !targetRect;

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const mobile = window.innerWidth < 1024;
      const selector = mobile && step.mobileSelector ? step.mobileSelector : step.selector;
      if (!selector) {
        setTargetRect(null);
        return;
      }
      const el = document.querySelector(selector) as HTMLElement | null;
      setTargetRect(el ? el.getBoundingClientRect() : null);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step, stepIndex]);

  const cardStyle = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const mobile = viewportWidth < 1024;
    const cardWidth = Math.min(isOverview ? 560 : 500, viewportWidth - (mobile ? 24 : 64));

    if (mobile) {
      return {
        width: cardWidth,
        left: `${Math.max(12, (viewportWidth - cardWidth) / 2)}px`,
        bottom: "max(12px, env(safe-area-inset-bottom))",
        maxHeight: "min(78vh, 720px)",
      };
    }

    if (isOverview) {
      return {
        width: cardWidth,
        left: `${Math.max(16, (viewportWidth - cardWidth) / 2)}px`,
        top: `${Math.max(24, (viewportHeight - 620) / 2)}px`,
        maxHeight: "calc(100vh - 32px)",
      };
    }

    return {
      width: cardWidth,
      left: `${Math.max(16, (viewportWidth - cardWidth) / 2)}px`,
      top: `${Math.max(24, (viewportHeight - 620) / 2)}px`,
      maxHeight: "calc(100vh - 32px)",
    };
  }, [isOverview]);

  const highlightStyle = useMemo(() => {
    if (!targetRect) return undefined;
    return {
      top: `${targetRect.top - 10}px`,
      left: `${targetRect.left - 10}px`,
      width: `${targetRect.width + 20}px`,
      height: `${targetRect.height + 20}px`,
    };
  }, [targetRect]);

  if (!open || !step) return null;

  return (
    <div className="fixed inset-0 z-[320]">
      <button
        type="button"
        aria-label="Close tour"
        onClick={() => onClose("dismissed")}
        className="absolute inset-0 bg-[rgba(4,8,20,0.76)] backdrop-blur-[4px]"
      />

      {targetRect && (
        <div
          className="pointer-events-none fixed rounded-[1.9rem] border border-[#d7c7ff]/35 bg-white/[0.02] shadow-[0_0_0_9999px_rgba(4,8,20,0.38),0_24px_80px_rgba(9,14,30,0.56)]"
          style={highlightStyle}
        />
      )}

      <div
        className="fixed rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,31,53,0.98),rgba(11,18,34,0.98))] shadow-[0_30px_90px_rgba(2,6,16,0.58)] overflow-hidden"
        style={cardStyle}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(208,188,255,0.2),transparent_68%)]" />

        <div className="relative flex max-h-[inherit] flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              {stepIndex === 0 ? (
                <BrandMark className="h-14 w-14 rounded-[1.35rem]" glyphClassName="h-7 w-7" />
              ) : (
                <div className="inline-flex items-center rounded-full border border-[#d0bcff]/16 bg-[#171f33] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#d7c7ff]">
                  {step.eyebrow}
                </div>
              )}
              {stepIndex === 0 && <p className="app-eyebrow">{step.eyebrow}</p>}
            </div>
            <button
              type="button"
              onClick={() => onClose("dismissed")}
              className="min-h-10 min-w-10 rounded-2xl bg-white/5 text-[#b5c0d8] transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss tour"
            >
              <AppIcon name="close" className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
            <div>
              <h2 className="app-hero-title text-[1.9rem] leading-[0.94] text-[#f2f5ff] sm:text-[2.25rem]">
                {step.title}
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-[#b8c3dc]">
                {step.description}
              </p>
              {step.detail && <p className="mt-3 text-sm leading-7 text-[#8fa0c3]">{step.detail}</p>}
            </div>

            {step.bullets && step.bullets.length > 0 && (
              <div className="grid gap-2.5">
                {step.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-3.5 py-3">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#b58cff]" />
                    <span className="text-sm leading-6 text-[#d7e1f7]">{bullet}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-white/6 pt-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                {steps.map((tourStep, index) => (
                  <button
                    key={tourStep.id}
                    type="button"
                    onClick={() => onStepChange(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === stepIndex ? "w-8 bg-[#c8a8ff]" : "w-2.5 bg-white/16 hover:bg-white/26"
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => onClose("dismissed")}
                  className="min-h-11 min-w-[4.75rem] rounded-2xl px-4 text-sm font-medium text-[#9cadce] transition-colors hover:text-[#edf2ff]"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
                  disabled={stepIndex === 0}
                  className="min-h-11 min-w-[5.25rem] rounded-2xl border border-white/8 bg-white/[0.03] px-4 text-sm font-medium text-[#d5def3] transition-colors hover:bg-white/[0.07] disabled:opacity-35 disabled:pointer-events-none"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (stepIndex >= steps.length - 1) {
                      onClose("completed");
                      return;
                    }
                    onStepChange(stepIndex + 1);
                  }}
                  className="min-h-11 min-w-[7.5rem] rounded-2xl px-4 text-sm font-semibold shadow-[0_14px_36px_rgba(160,120,255,0.24)]"
                  style={{ background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", color: "#340080" }}
                >
                  {stepIndex >= steps.length - 1 ? "Done" : stepIndex === 0 ? "Start tour" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
