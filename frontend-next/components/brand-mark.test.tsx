import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BrandMark } from "./brand-mark";

test("BrandMark renders the Seven wordmark and an svg robot mark", () => {
  const markup = renderToStaticMarkup(<BrandMark />);

  assert.match(markup, /Seven/);
  assert.match(markup, /<svg/);
  assert.match(markup, /seven-mark/);
});
