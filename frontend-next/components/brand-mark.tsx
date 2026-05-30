import React from "react";

type BrandMarkProps = {
  showWordmark?: boolean;
};

export function BrandMark({ showWordmark = true }: BrandMarkProps) {
  return (
    <div className="brandMark">
      <span className="srOnly">Seven</span>
      <span aria-hidden="true" className="brandGlyph">
        <svg
          className="seven-mark"
          viewBox="0 0 88 88"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="seven-bloom" x1="16" x2="72" y1="12" y2="76">
              <stop offset="0%" stopColor="#ff6b7f" />
              <stop offset="55%" stopColor="#d7192d" />
              <stop offset="100%" stopColor="#8f1024" />
            </linearGradient>
          </defs>
          <rect
            fill="rgba(255,255,255,0.18)"
            height="26"
            rx="12"
            stroke="url(#seven-bloom)"
            strokeWidth="3"
            width="36"
            x="26"
            y="12"
          />
          <circle cx="38" cy="25" fill="#d7192d" r="2.8" />
          <circle cx="50" cy="25" fill="#d7192d" r="2.8" />
          <path
            d="M36 10c0-5 4-8 8-8s8 3 8 8"
            fill="none"
            stroke="url(#seven-bloom)"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M20 42h48L46 76"
            fill="none"
            stroke="url(#seven-bloom)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
          />
          <path
            d="M44 46l-8 22"
            fill="none"
            stroke="#f8d5da"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="brandWordmark">
          <span>Sev</span>
          <span className="brandWordmarkAccent">en</span>
        </span>
      ) : null}
    </div>
  );
}
