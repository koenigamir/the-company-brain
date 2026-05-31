"use client";

import React from "react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  ROLE_CATALOG,
  formatClearanceLabel,
  getDocumentVisibilitySummary,
  getRoleCatalogEntry,
} from "../../lib/companyBrainPresentation";
import type {
  CompanyBrainIngestResult,
  RolesResponse,
} from "../../types/companyBrain";

const automaticRoleOption = "Auto-detect from filename";
const roleOptions = [automaticRoleOption, ...ROLE_CATALOG.map((entry) => entry.name)];

const acceptedFileTypes = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".xlsm",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".mp3",
  ".mp4",
  ".m4a",
  ".wav",
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [roleOwner, setRoleOwner] = useState(roleOptions[0]);
  const [visibilityRoles, setVisibilityRoles] = useState<string[]>([]);
  const [minClearance, setMinClearance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompanyBrainIngestResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState(roleOptions);
  const [rolesBackend, setRolesBackend] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRoles() {
      try {
        const response = await fetch("/api/company-brain/roles", {
          cache: "no-store",
        });
        const body = (await response.json()) as RolesResponse;
        if (!response.ok || !body.roles?.length) {
          return;
        }
        if (isMounted) {
          setAvailableRoles(
            Array.from(new Set([automaticRoleOption, ...body.roles, ...roleOptions])),
          );
          setRolesBackend(body.backend);
        }
      } catch {
        // Keep the static fallback list if the roles endpoint is unavailable.
      }
    }

    void loadRoles();

    return () => {
      isMounted = false;
    };
  }, []);

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Please choose a document before uploading.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (roleOwner !== roleOptions[0]) {
        formData.append("role_owner", roleOwner);
      }
      visibilityRoles.forEach((visibilityRole) => {
        formData.append("visibility_roles", visibilityRole);
      });
      if (minClearance) {
        formData.append("min_clearance", minClearance);
      }

      const response = await fetch("/api/company-brain/ingest", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Upload failed.");
      }

      setResult(body as CompanyBrainIngestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  const selectedRoleDetails =
    roleOwner !== automaticRoleOption ? getRoleCatalogEntry(roleOwner) : null;
  const visibilityRoleOptions = availableRoles.filter(
    (option) => option !== automaticRoleOption,
  );
  const visibilitySummary =
    visibilityRoles.length === 0
      ? "Backend default"
      : visibilityRoles.includes("ALL")
        ? "All roles"
        : visibilityRoles.join(", ");

  function toggleVisibilityRole(role: string) {
    setVisibilityRoles((current) => {
      if (role === "ALL") {
        return current.includes("ALL") ? [] : ["ALL"];
      }

      const next = current.filter((entry) => entry !== "ALL");
      if (next.includes(role)) {
        return next.filter((entry) => entry !== role);
      }
      return [...next, role];
    });
  }

  return (
    <main className="pageShell">
      <section className="pageIntro minimalPageIntro">
        <p className="eyebrow">Upload Workspace</p>
        <h1>Add new knowledge</h1>
      </section>

      <section className="toolLayout">
        <div className="toolCard uploadCard">
          <form className="stackForm" onSubmit={submitUpload}>
            <label className="fieldLabel" htmlFor="file">
              Document
            </label>
            <label className="uploadDropzone" htmlFor="file">
              <input
                accept={acceptedFileTypes.join(",")}
                className="uploadInput"
                id="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <span className="uploadTitle">
                {file ? file.name : "Choose a file to ingest"}
              </span>
              <span className="uploadHint">
                Supported formats: {acceptedFileTypes.join(", ")}
              </span>
            </label>

            <label className="fieldLabel" htmlFor="roleOwner">
              Assign owner
            </label>
            <select
              className="fieldInput"
              id="roleOwner"
              onChange={(event) => setRoleOwner(event.target.value)}
              value={roleOwner}
            >
              {availableRoles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <div className="selectionHintCard">
              {selectedRoleDetails ? (
                <>
                  <h3>{selectedRoleDetails.name}</h3>
                  <p>{selectedRoleDetails.description}</p>
                  <div className="tagRow">
                    {selectedRoleDetails.tags.map((tag) => (
                      <span className="tagChip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3>Automatic role assignment</h3>
                  <p>
                    Automatic assignment uses the shared SIX role catalog and can
                    attach multiple owning roles when a document clearly spans more
                    than one domain.
                  </p>
                </>
              )}
            </div>

            <div className="selectionHintCard">
              <h3>Access controls</h3>
              <p>
                Keep the backend default access model, publish to all roles, or
                limit visibility to specific teams with a minimum clearance.
              </p>

              <div className="chipToggleRow">
                <button
                  className={`ghostChip${visibilityRoles.length === 0 ? " active" : ""}`}
                  onClick={() => setVisibilityRoles([])}
                  type="button"
                >
                  Backend default
                </button>
                <button
                  className={`ghostChip${visibilityRoles.includes("ALL") ? " active" : ""}`}
                  onClick={() => toggleVisibilityRole("ALL")}
                  type="button"
                >
                  All roles
                </button>
              </div>

              <div className="checkChipGrid">
                {visibilityRoleOptions.map((option) => (
                  <button
                    className={`checkChip${
                      visibilityRoles.includes(option) ? " active" : ""
                    }`}
                    key={option}
                    onClick={() => toggleVisibilityRole(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>

              <label className="fieldLabel" htmlFor="minClearance">
                Minimum clearance
              </label>
              <select
                className="fieldInput"
                id="minClearance"
                onChange={(event) => setMinClearance(event.target.value)}
                value={minClearance}
              >
                <option value="">Backend default</option>
                <option value="intern">Intern</option>
                <option value="standard">Standard</option>
                <option value="senior">Senior</option>
              </select>

              <dl className="detailGrid compactDetailGrid">
                <div className="detailTile">
                  <dt>Visibility</dt>
                  <dd>{visibilitySummary}</dd>
                </div>
                <div className="detailTile">
                  <dt>Clearance</dt>
                  <dd>{formatClearanceLabel(minClearance)}</dd>
                </div>
                <div className="detailTile">
                  <dt>Catalog source</dt>
                  <dd>{rolesBackend || "Fallback static catalog"}</dd>
                </div>
              </dl>
            </div>

            <div className="actionRow">
              <button
                className="primaryButton"
                disabled={isUploading || !file}
                type="submit"
              >
                {isUploading ? "Ingesting document..." : "Upload"}
              </button>
              <Link className="secondaryLink" href="/query">
                Go to query workspace
              </Link>
            </div>
          </form>

          <div className="infoStrip">
            <div className="infoTile">
              <h3>What happens after upload</h3>
              <p>
                The backend saves the file, extracts text or media content,
                regenerates chunks, refreshes vectors, and merges graph entities for
                that document.
              </p>
            </div>
            <div className="infoTile">
              <h3>Best-fit content</h3>
              <p>
                This flow is built for documents tied to product coverage, regulatory
                interpretation, ESG disclosures, tax workflows, and reference-data
                operations, plus screenshots, transcripts, and short demo media.
              </p>
            </div>
            <div className="infoTile">
              <h3>Current role catalog</h3>
              <p>
                Roles are loaded from the backend via the local proxy route and are
                currently served from {rolesBackend || "the fallback static list"}.
              </p>
            </div>
          </div>

          {error ? (
            <div className="feedbackCard errorCard">
              <strong>Upload failed</strong>
              <p>{error}</p>
            </div>
          ) : null}

          {result?.ok ? (
            <section className="feedbackCard successCard">
              <strong>Document indexed</strong>
              <p>
                {result.filename || "The file"} was indexed with{" "}
                {result.chunks ?? "new"} generated chunks.
              </p>
              <dl className="detailGrid">
                <div className="detailTile">
                  <dt>Owner</dt>
                  <dd>
                    {result.role_owners?.length
                      ? result.role_owners.join(", ")
                      : result.role_owner || "Auto-detected"}
                  </dd>
                </div>
                <div className="detailTile">
                  <dt>Role reason</dt>
                  <dd>{result.role_reason || "No explicit routing reason returned."}</dd>
                </div>
                <div className="detailTile">
                  <dt>Visibility</dt>
                  <dd>{getDocumentVisibilitySummary(result)}</dd>
                </div>
                <div className="detailTile">
                  <dt>Minimum clearance</dt>
                  <dd>{formatClearanceLabel(result.min_clearance)}</dd>
                </div>
                <div className="detailTile">
                  <dt>Entities</dt>
                  <dd>
                    {result.entities?.length
                      ? result.entities.join(", ")
                      : "No graph entities were extracted."}
                  </dd>
                </div>
                <div className="detailTile">
                  <dt>Modality</dt>
                  <dd>{result.modality || "document"}</dd>
                </div>
                <div className="detailTile">
                  <dt>Extractor</dt>
                  <dd>
                    {result.extractor
                      ? `${result.extractor}${
                          typeof result.extraction_confidence === "number"
                            ? ` (${result.extraction_confidence})`
                            : ""
                        }`
                      : "Direct text ingest"}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
