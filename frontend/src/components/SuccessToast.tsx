"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface SuccessToastProps {
  title: string;
  subtitle?: string;
  /** Duration in ms before the parent triggers redirect. Default: 2200 */
  duration?: number;
}

export function SuccessToast({ title, subtitle, duration = 2200 }: SuccessToastProps) {
  const [visible, setVisible] = useState(false);

  // Trigger the enter animation after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        /* Semi-opaque backdrop */
        background: "rgba(6, 10, 20, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition: "opacity 0.35s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          padding: "2.5rem 3rem",
          borderRadius: "1.25rem",
          background: "hsl(222 40% 8% / 0.95)",
          border: "1px solid hsl(217 33% 22% / 0.6)",
          boxShadow:
            "0 0 0 1px hsl(160 84% 39% / 0.2), 0 25px 60px hsl(222 47% 5% / 0.6), 0 0 40px hsl(160 84% 39% / 0.08)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(16px)",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease",
          minWidth: "22rem",
          textAlign: "center",
        }}
      >
        {/* Subtle top-edge gradient accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, hsl(160 84% 39%), hsl(263 70% 55%), transparent)",
          }}
        />

        {/* Animated check icon */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "4.5rem",
            height: "4.5rem",
          }}
        >
          {/* Pulsing ring */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "hsl(160 84% 39% / 0.12)",
              animation: "rf-success-pulse 1.6s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "6px",
              borderRadius: "50%",
              background: "hsl(160 84% 39% / 0.08)",
              animation: "rf-success-pulse 1.6s ease-in-out 0.3s infinite",
            }}
          />
          <CheckCircle2
            style={{
              width: "2.5rem",
              height: "2.5rem",
              color: "hsl(160 84% 42%)",
              filter: "drop-shadow(0 0 10px hsl(160 84% 39% / 0.5))",
              animation: "rf-icon-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both",
            }}
          />
        </div>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "hsl(210 40% 93%)",
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
            }}
          >
            {title}
          </p>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "hsl(215 20% 55%)",
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Auto-dismissal progress bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "hsl(217 33% 16% / 0.6)",
            borderRadius: "0 0 1.25rem 1.25rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, hsl(160 84% 39%), hsl(263 70% 55%))",
              animation: `rf-progress-shrink ${duration}ms linear forwards`,
              transformOrigin: "left",
            }}
          />
        </div>
      </div>

      {/* Keyframes injected once via a style tag */}
      <style>{`
        @keyframes rf-success-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 0.3; }
        }
        @keyframes rf-icon-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes rf-progress-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
