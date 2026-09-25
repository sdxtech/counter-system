import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { takeMenuStock } from "./take-menu-stock.ts";

function client(fetch) {
  return createClient("https://stock-test.supabase.co", "public-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
}

test("the RPC requests one row and uses its returned stock without a follow-up query", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const requests = [];
  const supabase = client(async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify({ id, qty: 9 }), { status: 200 });
  });
  assert.deepEqual(await takeMenuStock(supabase, id), { success: true, qty: 9 });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/rest\/v1\/rpc\/take_menu_item$/);
  assert.equal(requests[0].init.method, "POST");
  assert.equal(new Headers(requests[0].init.headers).get("Accept"), "application/vnd.pgrst.object+json");
  assert.deepEqual(JSON.parse(requests[0].init.body), { p_menu_item_id: id });
});

test("database stock depletion returns an error without a second write", async () => {
  let attempts = 0;
  const supabase = client(async () => {
    attempts++;
    return new Response(JSON.stringify({ message: "qty cannot go below zero", code: "P0001" }), { status: 400 });
  });
  assert.deepEqual(await takeMenuStock(supabase, "menu"), { success: false, message: "Qty menu sudah habis." });
  assert.equal(attempts, 1);
});

test("missing or malformed stock cannot be acknowledged as a saved count", async () => {
  for (const data of [null, {}, { qty: -1 }, { qty: "5" }, [{ qty: 5 }]]) {
    const supabase = client(async () => new Response(JSON.stringify(data), { status: 200 }));
    assert.equal((await takeMenuStock(supabase, "menu")).success, false);
  }
});

test("connection loss produces an error without retrying a possibly committed RPC", async () => {
  let attempts = 0;
  const supabase = client(async () => {
    attempts++;
    throw new Error("Connection lost after commit");
  });
  assert.equal((await takeMenuStock(supabase, "menu")).success, false);
  assert.equal(attempts, 1);
});
