import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 18% 18%, rgba(96, 76, 196, 0.22), transparent 26%), radial-gradient(circle at 82% 16%, rgba(181, 140, 255, 0.18), transparent 22%), linear-gradient(180deg, #081224 0%, #0b1326 100%)",
          color: "#eef2ff",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 48,
            display: "flex",
            borderRadius: 40,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(22,31,53,0.96), rgba(11,18,34,0.96))",
            boxShadow: "0 30px 80px rgba(2,6,16,0.4)",
            padding: 56,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "rgba(215, 199, 255, 0.85)",
                marginBottom: 26,
              }}
            >
              Neural Mob
            </div>
            <div
              style={{
                fontSize: 78,
                lineHeight: 0.95,
                fontWeight: 800,
                letterSpacing: "-0.05em",
                maxWidth: 620,
              }}
            >
              Multi-model reasoning with live synthesis.
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 28,
                lineHeight: 1.45,
                color: "rgba(193, 204, 229, 0.92)",
                maxWidth: 620,
              }}
            >
              Run independent model passes, compare answers, merge the strongest reasoning, and keep every session in one workspace.
            </div>
          </div>

          <div
            style={{
              width: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 210,
                height: 210,
                borderRadius: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at 26% 22%, rgba(255,255,255,0.48), transparent 24%), radial-gradient(circle at 72% 78%, rgba(79,31,178,0.42), transparent 38%), linear-gradient(145deg, #ddd0ff 0%, #b794ff 38%, #835fe9 74%, #5935bb 100%)",
                boxShadow: "0 20px 60px rgba(160,120,255,0.24)",
              }}
            >
              <div
                style={{
                  width: 106,
                  height: 106,
                  position: "relative",
                  display: "flex",
                }}
              >
                <svg viewBox="0 0 64 64" width="106" height="106" fill="none">
                  <path d="M18 46V18" stroke="#2B1154" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18 18L46 46" stroke="#2B1154" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M46 46V18" stroke="#2B1154" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18 32C25 27 31 27 38 32" stroke="#5B31B0" strokeOpacity="0.62" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M26 20C31 24 35 28 39 34" stroke="#5B31B0" strokeOpacity="0.62" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="18" cy="18" r="4.75" fill="#F2EBFF" />
                  <circle cx="18" cy="46" r="4.75" fill="#2F125F" />
                  <circle cx="46" cy="18" r="4.75" fill="#F2EBFF" />
                  <circle cx="46" cy="46" r="4.75" fill="#2F125F" />
                  <circle cx="32" cy="32" r="8.25" stroke="rgba(43,17,84,0.18)" strokeWidth="1.6" />
                  <circle cx="32" cy="32" r="4.5" fill="#2F125F" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
