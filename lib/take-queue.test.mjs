import assert from "node:assert/strict";
import { test } from "node:test";
import { TakeQueue } from "./take-queue.ts";

const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(items = [{ id: "menu", qty: 10 }]) {
  const requests = [];
  const queue = new TakeQueue(items, (id) => new Promise((resolve, reject) => {
    requests.push({ id, resolve, reject });
  }));
  return { queue, requests, state: (id = "menu") => queue.getSnapshot().items[id] };
}

test("rapid clicks update immediately and each writes once, in order", async () => {
  const { queue, requests, state } = setup([{ id: "menu", qty: 20 }]);
  for (let i = 0; i < 20; i++) assert.equal(queue.take("menu"), true);
  assert.equal(queue.take("menu"), false);
  assert.equal(state().qty, 0);
  assert.equal(state().pending, 20);
  assert.equal(requests.length, 1);

  for (let i = 0; i < 20; i++) {
    assert.equal(requests.length, i + 1, "one in-flight write for this menu");
    requests[i].resolve({ success: true, qty: 19 - i });
    await flush();
    assert.equal(state().qty, 0, "confirmed writes must not subtract pending clicks twice");
    assert.equal(state().pending, 19 - i);
  }
  assert.equal(requests.length, 20);
  assert.equal(queue.getSnapshot().pending, 0);
});

test("clicks arriving during a slow response remain in the queue", async () => {
  const { queue, requests, state } = setup();
  queue.take("menu");
  queue.take("menu");
  requests[0].resolve({ success: true, qty: 9 });
  await flush();
  queue.take("menu");
  queue.take("menu");
  assert.equal(state().qty, 6);
  assert.equal(state().pending, 3);
  for (let i = 1; i < 4; i++) {
    requests[i].resolve({ success: true, qty: 9 - i });
    await flush();
  }
  assert.equal(state().qty, 6);
  assert.equal(state().pending, 0);
});

test("normal and full-mode subscribers see the same stock and pending clicks", async () => {
  const { queue, requests } = setup();
  let normal;
  let fullscreen;
  const unsubscribe = queue.subscribe(() => { normal = queue.getSnapshot(); });
  queue.subscribe(() => { fullscreen = queue.getSnapshot(); });
  queue.take("menu");
  assert.equal(normal, fullscreen);
  assert.equal(normal.items.menu.qty, 9);
  unsubscribe(); // Leaving one view must not cancel or duplicate its pending write.
  requests[0].resolve({ success: true, qty: 9 });
  await flush();
  assert.equal(fullscreen.items.menu.pending, 0);
  assert.equal(fullscreen.items.menu.qty, 9);
  assert.equal(requests.length, 1);
});

test("an unrelated menu can accept clicks while another one is saving", async () => {
  const { queue, requests, state } = setup([{ id: "a", qty: 5 }, { id: "b", qty: 3 }]);
  queue.take("a");
  queue.take("a");
  queue.take("b");
  assert.deepEqual(requests.map((request) => request.id), ["a", "b"]);
  assert.equal(queue.getSnapshot().pending, 3);
  requests[1].resolve({ success: true, qty: 2 });
  await flush();
  assert.equal(state("b").qty, 2);
  assert.equal(state("a").pending, 2);
  requests[0].resolve({ success: true, qty: 4 });
  await flush();
  requests[2].resolve({ success: true, qty: 3 });
  await flush();
  assert.equal(queue.getSnapshot().pending, 0);
});

test("stock taken on another device cancels only clicks exceeding remaining stock", async () => {
  const { queue, requests, state } = setup();
  for (let i = 0; i < 5; i++) queue.take("menu");
  requests[0].resolve({ success: true, qty: 1 });
  await flush();
  assert.equal(state().pending, 1);
  assert.equal(state().qty, 0);
  assert.match(state().error, /3 pengambilan berikutnya dibatalkan/);
  assert.equal(queue.take("menu"), false);
  requests[1].resolve({ success: true, qty: 0 });
  await flush();
  assert.equal(requests.length, 2);
  assert.equal(state().qty, 0);
  assert.equal(state().pending, 0);
});

test("a rejected transaction clears unsent clicks and requires authoritative reload", async () => {
  const { queue, requests, state } = setup();
  for (let i = 0; i < 4; i++) queue.take("menu");
  requests[0].resolve({ success: true, qty: 9 });
  await flush();
  requests[1].resolve({ success: false, message: "Qty menu sudah habis." });
  await flush();
  assert.equal(state().qty, 9, "keep the last confirmed stock until the reload");
  assert.equal(state().pending, 0);
  assert.equal(state().needsRefresh, true);
  assert.match(state().error, /2 pengambilan berikutnya dibatalkan/);
  assert.equal(queue.take("menu"), false);
  assert.equal(requests.length, 2);
});

test("lost responses never trigger retries that could decrement stock twice", async () => {
  const { queue, requests, state } = setup();
  queue.take("menu");
  queue.take("menu");
  requests[0].reject(new Error("Connection lost after commit"));
  await flush();
  assert.equal(requests.length, 1);
  assert.equal(state().pending, 0);
  assert.equal(state().needsRefresh, true);
  assert.match(state().error, /belum dapat dipastikan/);
  assert.equal(queue.take("menu"), false);
  queue.syncItems([{ id: "menu", qty: 10 }]);
  assert.equal(queue.take("menu"), false, "a stale prop update must not clear the error lock");
});

test("malformed success responses are treated as uncertain writes", async () => {
  for (const qty of [NaN, -1, 1.5, undefined]) {
    const { queue, requests, state } = setup();
    queue.take("menu");
    requests[0].resolve({ success: true, qty });
    await flush();
    assert.equal(state().needsRefresh, true);
    assert.equal(state().pending, 0);
    assert.equal(requests.length, 1);
  }
});

test("incoming page props cannot overwrite stock while a write is in flight", async () => {
  const { queue, requests, state } = setup();
  queue.take("menu");
  queue.take("menu");
  queue.syncItems([{ id: "menu", qty: 100 }]);
  assert.equal(state().qty, 8);
  requests[0].resolve({ success: true, qty: 9 });
  await flush();
  requests[1].resolve({ success: true, qty: 8 });
  await flush();
  assert.equal(state().qty, 8);
  queue.syncItems([{ id: "menu", qty: 25 }]); // Later stock edit after the queue drains.
  assert.equal(state().qty, 25);
});

test("unknown/empty menus reject clicks and reset removes idle menu state", () => {
  const { queue, requests } = setup([{ id: "empty", qty: 0 }]);
  assert.equal(queue.take("empty"), false);
  assert.equal(queue.take("missing"), false);
  queue.syncItems([]);
  assert.deepEqual(queue.getSnapshot(), { items: {}, pending: 0 });
  assert.equal(requests.length, 0);
});
