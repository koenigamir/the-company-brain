import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BrandMark, IntelligenceLogo, SixLogo } from "./brand-mark";

test("BrandMark renders the intelligence wordmark and a robot mark", () => {
  const markup = renderToStaticMarkup(<BrandMark />);

  assert.match(markup, /intelligence/);
  assert.match(markup, /<svg/);
  assert.match(markup, /seven-mark/);
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
