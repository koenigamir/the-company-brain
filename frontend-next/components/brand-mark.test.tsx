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

test("Home keeps the seven created for lockup with the SIX logo", () => {
  const markup = renderToStaticMarkup(<Home />);

  assert.match(markup, /seven created for/);
  assert.match(markup, /six-logo\.png/);
});

test("Query page keeps only the minimal centered copy", () => {
  const markup = renderToStaticMarkup(<QueryPage />);

  assert.match(markup, /Ask the company knowledge base/);
  assert.match(markup, /Your question/);
  assert.match(
    markup,
    /Which SIX workflow covers MiFID II product governance questions\?/,
  );
  assert.doesNotMatch(
    markup,
    /Search across the indexed regulatory, tax, ESG, and reference-data corpus/,
  );
  assert.doesNotMatch(markup, /Start with a real compliance question/);
});

test("Upload page removes the long explanatory intro copy", () => {
  const markup = renderToStaticMarkup(<UploadPage />);

  assert.match(markup, /Add new knowledge/);
  assert.doesNotMatch(
    markup,
    /Upload reference documents so the backend can extract text, create chunks/,
  );
});

test("Welcome page keeps only the catalog overview without workspace overview or role selector", () => {
  const markup = renderToStaticMarkup(<WelcomePage />);

  assert.match(markup, /Catalog Overview/);
  assert.match(markup, /0 indexed documents/);
  assert.doesNotMatch(markup, /Workspace overview/);
  assert.doesNotMatch(markup, /Choose a role lens/);
  assert.doesNotMatch(markup, /All roles/);
});
