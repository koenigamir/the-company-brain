"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { HealthResponse } from "../types/companyBrain";
import { BrandMark } from "./brand-mark";

const navigation = [
  { href: "/", label: "Welcome" },
  { href: "/query", label: "Query" },
  { href: "/upload", label: "Upload" },
];

type HealthState =
  | { tone: "loading"; label: string; detail: string }
  | { tone: "online"; label: string; detail: string }
  | { tone: "warning"; label: string; detail: string }
  | { tone: "offline"; label: string; detail: string };

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function describeHealth(health: HealthResponse): HealthState {
  if (health.ok && health.graph_exists && health.chroma_dir_exists) {
    return {
      tone: "online",
      label: "Knowledge live",
      detail: health.store_dir_exists
        ? "Graph, vector index, and store are available."
        : "Graph and vector index are available.",
    };
  }

  return {
    tone: "warning",
    label: "Backend live",
    detail: "The service is reachable, but the index looks incomplete.",
  };
}

export function SiteHeader() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthState>({
    tone: "loading",
    label: "Checking backend",
    detail: "Verifying API availability.",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const response = await fetch("/api/company-brain/health", {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "Health check failed.");
        }

        if (isMounted) {
          setHealth(describeHealth(body as HealthResponse));
        }
      } catch {
        if (isMounted) {
          setHealth({
            tone: "offline",
            label: "Backend unavailable",
            detail: "Query and upload actions will stay disabled until it responds.",
          });
        }
      }
    }

    void loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="siteHeader">
      <div className="siteHeaderInner">
        <Link aria-label="Seven home" className="brandLink" href="/">
          <BrandMark />
        </Link>

        <nav aria-label="Primary" className="siteNav">
          {navigation.map((item) => (
            <Link
              className={`siteNavLink${
                isActivePath(pathname, item.href) ? " active" : ""
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={`healthBadge ${health.tone}`}>
          <span className="healthLabel">{health.label}</span>
          <span className="healthDetail">{health.detail}</span>
        </div>
      </div>
    </header>
  );
}
