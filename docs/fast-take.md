# Rapid Take clicks

Each Take click decreases the displayed quantity immediately and adds one pending write. A shared queue belongs to the staff dashboard, so the normal view and Full Mode display the same quantity and use the same queue. Switching views does not cancel pending writes.

Writes run sequentially for each menu using the existing `take_menu_item` RPC. The RPC locks the menu row, verifies access, prevents negative stock, records the audit entry, and returns the new stock. The client requests `.single()` to receive that row as an object; [PostgREST supports singular JSON responses for table rows](https://docs.postgrest.org/en/stable/references/api/resource_representation.html#singular-or-plural). No database migration is required.

The Take action returns that stock directly and does not revalidate `/staff`. This avoids rerunning the dashboard's auth checks, menu/image queries, and cleanup after every click. Other management actions still refresh the page as before.

While the queue drains, the card displays `Menyimpan N pengambilan`. Edit, delete, reset, and logout are unavailable while writes are pending. The edit dialog starts with the current confirmed quantity after the queue drains.

If another device consumes the remaining stock, unsent clicks exceeding the returned stock are cancelled with a message. If a write fails or its response is lost, remaining clicks for that menu are cancelled and the card requires a stock reload. There is no automatic retry: a lost response might already have committed the decrement. Stock reload waits until other menus finish saving.

The queue is in memory. Closing/reloading the page while saves are pending prompts the browser's leave warning; it does not make the queue durable. Wait for the saving indicator to disappear before closing the page.

## Checks

Using Node.js 22.6+:

```bash
node --experimental-strip-types --test lib/take-queue.test.mjs lib/take-menu-stock.test.mjs
```

The queue tests cover rapid input, one in-flight write per menu, shared views, multiple menus, concurrent stock depletion, rejected/ambiguous writes, malformed responses, prop updates, and empty stock.

For a manual check using a test menu:

1. Set stock to 20, click Take five times quickly, and confirm the display immediately shows 15 while saving continues.
2. Switch to Full Mode and back while saving. Both views must keep the same quantity.
3. Wait until saving finishes, reload the page, and confirm stock is still 15. The edit form must also show 15.
4. Consume the remaining stock. The button must stop accepting clicks at zero.
5. Interrupt the connection during a write. The card must show an error and require a stock reload, without silently retrying the write.
