import React from "react";

const SIX_RED = "#E42313";
const SIX_RED_SOFT = "#F4B7B1";

type BrandMarkProps = {
  showWordmark?: boolean;
};

type RobotSevenGlyphProps = {
  className?: string;
};

type SixLogoProps = {
  className?: string;
};

type IntelligenceLogoProps = {
  className?: string;
};

export function RobotSevenGlyph({ className }: RobotSevenGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className={`seven-mark${className ? ` ${className}` : ""}`}
      viewBox="0 0 88 88"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="44" cy="8" fill={SIX_RED} r="3.8" />
      <path
        className="robot-antenna"
        d="M44 12v6"
        fill="none"
        stroke={SIX_RED}
        strokeLinecap="round"
        strokeWidth="3.5"
      />
      <rect
        className="robot-head"
        fill="rgba(228,35,19,0.08)"
        height="24"
        rx="9"
        stroke={SIX_RED}
        strokeWidth="4"
        width="42"
        x="23"
        y="18"
      />
      <path
        d="M18 25h5M18 34h5M65 25h5M65 34h5"
        fill="none"
        stroke={SIX_RED}
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle cx="37" cy="30" fill={SIX_RED} r="3.1" />
      <circle cx="51" cy="30" fill={SIX_RED} r="3.1" />
      <path
        d="M35 37h18"
        fill="none"
        stroke={SIX_RED}
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M44 42v7"
        fill="none"
        stroke={SIX_RED}
        strokeLinecap="round"
        strokeWidth="3.5"
      />
      <path
        d="M21 49h46"
        fill="none"
        stroke={SIX_RED}
        strokeLinecap="round"
        strokeWidth="5.5"
      />
      <path
        d="M24 49h38L39 80"
        fill="none"
        stroke={SIX_RED}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <path
        d="M43 55l-9 20"
        fill="none"
        stroke={SIX_RED_SOFT}
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function SixLogo({ className }: SixLogoProps) {
  return (
    <img
      alt="SIX logo"
      className={`six-logo${className ? ` ${className}` : ""}`}
      src="/six-logo.png"
    />
  );
}

export function IntelligenceLogo({ className }: IntelligenceLogoProps) {
  return (
    <div className={`intelligenceLogo${className ? ` ${className}` : ""}`}>
      <span className="srOnly">intelligence</span>
      <span className="intelligenceLogoGlyph">
        <RobotSevenGlyph />
      </span>
      <span aria-hidden="true" className="intelligenceLogoWord">
        intelligence
      </span>
    </div>
  );
}

export function BrandMark({ showWordmark = true }: BrandMarkProps) {
  return (
    <div className="brandMark">
      {showWordmark ? <IntelligenceLogo /> : <RobotSevenGlyph className="brandGlyphOnly" />}
    </div>
  );
}
