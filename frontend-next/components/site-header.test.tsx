import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SiteHeader } from "./site-header";

test("SiteHeader keeps only the intelligence brand in the top bar", () => {
  const markup = renderToStaticMarkup(<SiteHeader />);

  assert.match(markup, /intelligence/);
  assert.doesNotMatch(markup, /Welcome/);
  assert.doesNotMatch(markup, /Query/);
  assert.doesNotMatch(markup, /Upload/);
  assert.doesNotMatch(markup, /Knowledge live/);
});
