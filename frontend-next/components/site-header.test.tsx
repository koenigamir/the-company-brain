import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SiteHeaderFrame } from "./site-header";

test("SiteHeader keeps only the intelligence brand on the start page", () => {
  const markup = renderToStaticMarkup(<SiteHeaderFrame pathname="/" />);

  assert.match(markup, /intelligence/);
  assert.doesNotMatch(markup, /Welcome/);
  assert.doesNotMatch(markup, /Query/);
  assert.doesNotMatch(markup, /Add files/);
  assert.doesNotMatch(markup, /Knowledge live/);
});

test("SiteHeader shows workspace navigation on internal pages including a start link", () => {
  const markup = renderToStaticMarkup(
    <SiteHeaderFrame pathname="/welcome" />,
  );

  assert.match(markup, /intelligence/);
  assert.match(markup, />Start</);
  assert.match(markup, />Welcome</);
  assert.match(markup, />Query</);
  assert.match(markup, />Add files</);
});
