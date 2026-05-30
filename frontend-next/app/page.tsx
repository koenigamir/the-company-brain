import Link from "next/link";
import { SixLogo } from "../components/brand-mark";

const entryLinks = [
  { href: "/welcome", label: "Welcome", tone: "primary" },
  { href: "/query", label: "Query" },
  { href: "/upload", label: "Add files" },
];

export default function Home() {
  return (
    <main className="pageShell landingShell">
      <section className="identityHero">
        <div className="identityHeroInner">
          <p className="eyebrow">Company Brain Interface</p>
          <h1 aria-label="intelligence" className="intelligenceWordmark">
            <span aria-hidden="true" className="intelligenceInitial">
              <svg
                className="intelligenceMark"
                viewBox="0 0 88 88"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="intelligence-bloom" x1="16" x2="72" y1="12" y2="76">
                    <stop offset="0%" stopColor="#ff6b7f" />
                    <stop offset="55%" stopColor="#d7192d" />
                    <stop offset="100%" stopColor="#8f1024" />
                  </linearGradient>
                </defs>
                <rect
                  fill="rgba(255,255,255,0.18)"
                  height="26"
                  rx="12"
                  stroke="url(#intelligence-bloom)"
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
                  stroke="url(#intelligence-bloom)"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
                <path
                  d="M20 42h48L46 76"
                  fill="none"
                  stroke="url(#intelligence-bloom)"
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
            <span>ntelligence</span>
          </h1>

          <p className="creatorLockup">
            <span className="creatorCopy">seven created for</span>
            <SixLogo className="heroSixLogo" />
          </p>

          <p className="identityCopy">
            Enter the Seven workspace for grounded knowledge lookup, live backend
            visibility, and multimodal ingest into the updated Company Brain system.
          </p>

          <nav aria-label="Entry points" className="entryNav">
            {entryLinks.map((item) => (
              <Link
                className={`entryLink${item.tone === "primary" ? " primary" : ""}`}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
