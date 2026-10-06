import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { MAX_SITE_BACKGROUND_BYTES, validateSiteBackground } from "./site-background.ts";

test("accepts the existing default JPG and uppercase JPEG extensions", async () => {
  const bytes = await readFile(new URL("../public/pexels-steve-6433209.jpg", import.meta.url));
  for (const name of ["background.jpg", "background.JPEG"]) {
    assert.equal(await validateSiteBackground(new File([bytes], name, { type: "image/jpeg" })), null);
  }
});

test("rejects empty, oversized, wrong-format and renamed non-JPEG uploads", async () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  for (const file of [
    new File([], "empty.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(MAX_SITE_BACKGROUND_BYTES + 1)], "large.jpg", { type: "image/jpeg" }),
    new File([jpeg], "picture.png", { type: "image/png" }),
    new File([jpeg], "picture.jpg", { type: "image/png" }),
    new File(["not a jpeg"], "renamed.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array([0xff])], "truncated.jpg", { type: "image/jpeg" }),
  ]) {
    assert.equal(typeof await validateSiteBackground(file), "string", file.name);
  }
});

test("accepts the exact upload size limit", async () => {
  const bytes = new Uint8Array(MAX_SITE_BACKGROUND_BYTES);
  bytes.set([0xff, 0xd8, 0xff]);
  assert.equal(await validateSiteBackground(new File([bytes], "limit.jpg", { type: "image/jpeg" })), null);
});
