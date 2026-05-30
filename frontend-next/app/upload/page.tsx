"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import type {
  CompanyBrainIngestResult,
  RolesResponse,
} from "../../types/companyBrain";

const roleOptions = [
  "Auto-detect from filename",
  "ESG Compliance",
  "Master Data Ops",
  "Tax Team",
];

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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompanyBrainIngestResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState(roleOptions);

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
          setAvailableRoles([roleOptions[0], ...body.roles]);
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

  return (
    <main className="pageShell">
      <section className="pageIntro">
        <p className="eyebrow">Upload Workspace</p>
        <h1>Add new knowledge to Seven</h1>
        <p className="lede">
          Upload reference documents so the backend can extract text, create chunks,
          update the vector store, persist metadata, and connect the material into
          the graph.
        </p>
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

            <div className="actionRow">
              <button
                className="primaryButton"
                disabled={isUploading || !file}
                type="submit"
              >
                {isUploading ? "Ingesting document..." : "Upload to Seven"}
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
                Seven saves the file into the backend data directory, extracts text,
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
                {result.filename || "The file"} was added to Seven with{" "}
                {result.chunks ?? "new"} generated chunks.
              </p>
              <dl className="detailGrid">
                <div className="detailTile">
                  <dt>Owner</dt>
                  <dd>{result.role_owner || "Auto-detected"}</dd>
                </div>
                <div className="detailTile">
                  <dt>Entities</dt>
                  <dd>
                    {result.entities?.length
                      ? result.entities.join(", ")
                      : "No graph entities were extracted."}
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
