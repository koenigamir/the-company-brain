import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Home from "../app/page";
import QueryPage from "../app/query/page";
import UploadPage from "../app/upload/page";
import WelcomePage from "../app/welcome/page";
import { BrandMark, IntelligenceLogo, SixLogo } from "./brand-mark";

test("BrandMark renders the intelligence wordmark and a robot mark", () => {
  const markup = renderToStaticMarkup(<BrandMark />);

  assert.match(markup, /intelligence/);
  assert.match(markup, /<svg/);
  assert.match(markup, /seven-mark/);
  assert.match(markup, /robot-head/);
  assert.match(markup, /#E42313/);
});

test("SixLogo renders the provided sponsor image asset", () => {
  const markup = renderToStaticMarkup(<SixLogo />);

  assert.match(markup, /SIX logo/);
  assert.match(markup, /<img/);
  assert.match(markup, /six-logo\.png/);
  assert.match(markup, /six-logo/);
});

test("IntelligenceLogo exposes the full intelligence lockup", () => {
  const markup = renderToStaticMarkup(<IntelligenceLogo />);

  assert.match(markup, /intelligence/);
  assert.match(markup, /intelligenceLogoWord/);
});

test("Home keeps the created for lockup with the SIX logo", () => {
  const markup = renderToStaticMarkup(<Home />);

  assert.match(markup, />created for</);
  assert.doesNotMatch(markup, /seven created for/);
  assert.match(markup, /six-logo\.png/);
});

test("Query page renders as a compact chat interface", () => {
  const markup = renderToStaticMarkup(<QueryPage />);

  assert.match(markup, /Company Brain chat/);
  assert.match(markup, /chatThread/);
  assert.match(markup, /assistantMessage/);
  assert.match(markup, /chatComposer/);
  assert.match(markup, /Send/);
  assert.match(markup, /Agent profile/);
  assert.match(
    markup,
    /Which SIX workflow covers MiFID II product governance questions\?/,
  );
  assert.doesNotMatch(markup, /Your question/);
  assert.doesNotMatch(markup, /Ask the company knowledge base/);
  assert.doesNotMatch(markup, /Questions are filtered by the backend/);
  assert.doesNotMatch(markup, /Access profiles are currently served from/);
  assert.doesNotMatch(
    markup,
    /Search across the indexed regulatory, tax, ESG, and reference-data corpus/,
  );
  assert.doesNotMatch(markup, /Start with a real compliance question/);
});

test("Upload page removes the long explanatory intro copy", () => {
  const markup = renderToStaticMarkup(<UploadPage />);

  assert.match(markup, /Add new knowledge/);
  assert.match(markup, /1. Select file/);
  assert.match(markup, /2. Ownership/);
  assert.match(markup, /Advanced access/);
  assert.match(markup, /What happens next/);
  assert.doesNotMatch(markup, /Best-fit content/);
  assert.doesNotMatch(markup, /Current role catalog/);
  assert.doesNotMatch(
    markup,
    /Upload reference documents so the backend can extract text, create chunks/,
  );
});

test("Welcome page keeps only the catalog overview without workspace overview or role selector", () => {
  const markup = renderToStaticMarkup(<WelcomePage />);

  assert.match(markup, /Company Brain helps teams find trusted answers/);
  assert.match(markup, /Ask questions in plain language/);
  assert.match(markup, /See who owns each answer area/);
  assert.match(markup, /Improve knowledge when gaps appear/);
  assert.match(markup, /How knowledge flows/);
  assert.match(markup, /Company knowledge/);
  assert.match(markup, /Answer topics/);
  assert.match(markup, /Owning teams/);
  assert.match(markup, /Source owners/);
  assert.match(markup, /catalogGraph/);
  assert.match(markup, /catalogOwnerNode/);
  assert.match(markup, /catalogTopicPill/);
  assert.match(markup, /knowledge sources/);
  assert.doesNotMatch(markup, /Catalog Overview/);
  assert.doesNotMatch(markup, /Ownership graph/);
  assert.doesNotMatch(markup, /Backend/);
  assert.doesNotMatch(markup, /backend/);
  assert.doesNotMatch(markup, /frontend/);
  assert.doesNotMatch(markup, /registry/);
  assert.doesNotMatch(markup, /indexed/);
  assert.doesNotMatch(markup, /Role catalog/);
  assert.doesNotMatch(markup, /Access-Ready Documents/);
  assert.doesNotMatch(markup, /Document access list/);
  assert.doesNotMatch(markup, /Ownership at a glance/);
  assert.doesNotMatch(markup, /Documents are grouped by owner so teams can see what they maintain/);
  assert.doesNotMatch(markup, /Role description is not yet available/);
  assert.doesNotMatch(markup, /Live workspace snapshot/);
  assert.doesNotMatch(markup, /Workspace overview/);
  assert.doesNotMatch(markup, /Choose a role lens/);
  assert.doesNotMatch(markup, /All roles/);
});
