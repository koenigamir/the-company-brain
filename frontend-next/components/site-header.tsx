import React from "react";
import Link from "next/link";

import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <div className="siteHeaderInner minimalHeader">
        <Link aria-label="Intelligence home" className="brandLink" href="/">
          <BrandMark />
        </Link>
      </div>
    </header>
  );
}
