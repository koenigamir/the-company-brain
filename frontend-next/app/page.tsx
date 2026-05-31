import React from "react";
import Link from "next/link";
import { IntelligenceLogo, SixLogo } from "../components/brand-mark";

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
          <div className="heroIntelligenceLogo">
            <IntelligenceLogo />
          </div>

          <p className="creatorLockup">
            <span className="creatorCopy">created for</span>
            <SixLogo className="heroSixLogo" />
          </p>

          <p className="identityCopy">
            Grounded knowledge lookup, clear role ownership, and multimodal ingest
            for the updated Company Brain system.
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
