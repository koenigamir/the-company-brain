"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { SixLogo } from "../../components/brand-mark";
import {
  ROLE_CATALOG,
  getDocumentRoleList,
  getRoleCatalogEntry,
} from "../../lib/companyBrainPresentation";
import type {
  CompanyBrainDocument,
  DocumentsResponse,
  HealthResponse,
  RolesResponse,
} from "../../types/companyBrain";

type LoadState = {
  health: HealthResponse | null;
  roles: string[];
  rolesBackend: string | null;
  documents: CompanyBrainDocument[];
  healthError: string | null;
  rolesError: string | null;
  documentsError: string | null;
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed for ${url}.`);
  }
  return body;
}

export default function WelcomePage() {
  const [state, setState] = useState<LoadState>({
    health: null,
    roles: [],
    rolesBackend: null,
    documents: [],
    healthError: null,
    rolesError: null,
    documentsError: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      const [healthResult, rolesResult, documentsResult] = await Promise.allSettled([
        readJson<HealthResponse>("/api/company-brain/health"),
        readJson<RolesResponse>("/api/company-brain/roles"),
        readJson<DocumentsResponse>("/api/company-brain/documents"),
      ]);

      if (!isMounted) {
        return;
      }

      setState({
        health:
          healthResult.status === "fulfilled" ? healthResult.value : null,
        roles: rolesResult.status === "fulfilled" ? rolesResult.value.roles : [],
        rolesBackend:
          rolesResult.status === "fulfilled" ? rolesResult.value.backend : null,
        documents:
          documentsResult.status === "fulfilled"
            ? documentsResult.value.documents
            : [],
        healthError:
          healthResult.status === "rejected" ? healthResult.reason.message : null,
        rolesError:
          rolesResult.status === "rejected" ? rolesResult.reason.message : null,
        documentsError:
          documentsResult.status === "rejected"
            ? documentsResult.reason.message
            : null,
      });
    }

    void loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, []);

  const knownRoles = Array.from(
    new Set([
      ...ROLE_CATALOG.map((entry) => entry.name),
      ...state.roles,
      ...state.documents.flatMap((document) => getDocumentRoleList(document)),
    ]),
  );

  return (
    <main className="pageShell landingShell">
      <section className="landingHero">
        <div className="heroCopy">
          <p className="eyebrow">Welcome</p>
          <h1>Grounded answers, visible ownership, faster follow-up.</h1>
          <p className="lede">
            This frontend connects the Company Brain backend to a calmer workspace
            for regulatory, tax, ESG, and reference-data questions.
          </p>

          <div className="actionRow">
            <Link className="primaryButton" href="/query">
              Open query workspace
            </Link>
            <Link className="secondaryLink" href="/upload">
              Add new knowledge
            </Link>
          </div>
        </div>

        <div className="heroPanel cleanHeroPanel">
          <p className="heroPanelLabel">Live workspace snapshot</p>

          <div className="heroSnapshotGrid">
            <article className="snapshotMetric">
              <span className="snapshotValue">
                {state.health?.ok ? "Backend reachable" : "Waiting for backend"}
              </span>
              <span className="snapshotLabel">Status</span>
            </article>

            <article className="snapshotMetric">
              <span className="snapshotValue">{knownRoles.length}</span>
              <span className="snapshotLabel">Known roles</span>
            </article>

            <article className="snapshotMetric snapshotMetricWide">
              <span className="snapshotValue">{state.documents.length}</span>
              <span className="snapshotLabel">Stored documents</span>
            </article>
          </div>

          <p className="snapshotBody">
            Source: {state.rolesBackend || state.rolesError || "local proxy"}.
          </p>

          <div className="heroSponsorLockup cleanSponsorLockup">
            <span className="supportingCopy">created for</span>
            <SixLogo className="panelSixLogo" />
          </div>
        </div>
      </section>

      <section className="landingSection catalogSection">
        <div className="sectionHeading catalogHeading">
          <h2>Catalog Overview</h2>
        </div>

        <div className="roleCatalogGrid cleanCatalogGrid">
          {knownRoles.map((role) => {
            const entry = getRoleCatalogEntry(role);

            return (
              <article className="roleCard cleanRoleCard" key={role}>
                <h3>{entry.name}</h3>
                <p>{entry.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
