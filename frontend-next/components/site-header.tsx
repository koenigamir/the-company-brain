"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "./brand-mark";

type SiteHeaderFrameProps = {
  pathname: string;
};

const WORKSPACE_LINKS = [
  { href: "/welcome", label: "Welcome" },
  { href: "/query", label: "Query" },
  { href: "/upload", label: "Add files" },
];

export function SiteHeaderFrame({ pathname }: SiteHeaderFrameProps) {
  const showWorkspaceNav = pathname !== "/";

  return (
    <header className="siteHeader">
      <div className={`siteHeaderInner${showWorkspaceNav ? "" : " minimalHeader"}`}>
        <Link aria-label="Intelligence home" className="brandLink" href="/">
          <BrandMark />
        </Link>

        {showWorkspaceNav ? (
          <nav aria-label="Workspace navigation" className="siteNav">
            {WORKSPACE_LINKS.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  className={`siteNavLink${isActive ? " active" : ""}`}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </header>
  );
}

type SiteHeaderProps = {
  pathnameOverride?: string;
};

export function SiteHeader({ pathnameOverride }: SiteHeaderProps) {
  const pathname = usePathname() || "/";

  return <SiteHeaderFrame pathname={pathnameOverride || pathname} />;
}
