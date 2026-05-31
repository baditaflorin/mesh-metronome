import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer assertion for the ADVERTISED core action:
 * "4 phones become a polyrhythm grid ... all driven by the same mesh clock,
 * so the polyrhythm actually fits together instead of drifting apart."
 *
 * The subtle trap: all Playwright pages in one browser context share ONE
 * wall clock, so a BROKEN metronome that schedules off raw `Date.now()`
 * (a per-peer local timer with no mesh sync) would *also* look synchronized
 * here. To make this assertion genuinely prove the SHARED MESH CLOCK origin,
 * we inject a +500 ms `Date.now()` skew into ONE of four peers before it
 * loads. 500 ms is exactly one quarter cell of a 2000 ms bar at 120 BPM.
 *
 *   - With the real mesh clock (median-offset over Yjs awareness, >=3 peers),
 *     the lone skewed peer is an outlier the median rejects, so every phone —
 *     including the skewed one — resolves the SAME mesh-time and lights the
 *     SAME bar cell.
 *   - With a per-peer local timer reading the skewed `Date.now()` directly,
 *     the skewed peer's bar phase is offset by a full cell and it lights a
 *     DIFFERENT cell than its neighbours.
 *
 * We read each peer's lit subdivision off `.metro-bar[data-active-cell]` (the
 * index is derived from the shared-clock phase, the same boundary test the
 * cells use) and assert all four agree — sampled repeatedly to avoid landing
 * on a bar boundary.
 */

async function connectAndStart(page: Page) {
  await page.getByRole("button", { name: /connect to mesh/i }).click();
  await page.getByRole("button", { name: /^start$/i }).click();
}

async function activeCell(page: Page): Promise<number> {
  const raw = await page.locator(".metro-bar").getAttribute("data-active-cell");
  return Number(raw ?? "-1");
}

test("four phones lock to the same mesh-clock bar cell even when one peer's wall clock is skewed", async ({
  browser,
  baseURL,
}) => {
  // openTwoPeers gives a shared (BroadcastChannel-synced) context + peers a,b.
  // All peers inherit the default pattern (quarter) @ 120 BPM from a fresh
  // localStorage, so they share BPM + subdivision — the polyrhythm-lock
  // precondition the README states ("BPM ... must match across phones").
  const { context, a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix,
    roomId: `e2e-metro-${Math.random().toString(36).slice(2, 8)}`,
  });
  try {
    // Peer c: a third honest peer (the median needs >=3 to reject one outlier).
    const c = await context.newPage();
    await c.goto(baseURL ?? "");

    // Peer d: a fourth peer whose LOCAL WALL CLOCK is skewed +500 ms. Only the
    // raw `Date.now()` is shifted; the mesh clock must correct it back.
    const d = await context.newPage();
    await d.addInitScript(() => {
      const SKEW = 500;
      const RealDate = Date;
      const realNow = Date.now.bind(Date);
      // Override both Date.now() and `new Date()` so any local-timer code path
      // sees the skewed wall clock.
      const Skewed = class extends RealDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) super(realNow() + SKEW);
          else super(...(args as ConstructorParameters<typeof Date>));
        }
        static now() {
          return realNow() + SKEW;
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Date = Skewed;
    });
    await d.goto(baseURL ?? "");

    const peers = [a, b, c, d];
    for (const p of peers) {
      await connectAndStart(p);
    }

    // Every peer should see all four phones connected (peers + 1 in the HUD).
    for (const p of peers) {
      await expect(p.locator(".metro-hud")).toContainText("4 phones", { timeout: 15_000 });
    }

    // Give the mesh clock a few ping rounds (PING_INTERVAL is 1500 ms) to
    // settle the median offset and reject the skewed outlier.
    await a.waitForTimeout(5_000);

    // Sample the lit cell on all four peers at near-simultaneous instants and
    // require unanimous agreement on at least one clean (non-boundary) sample.
    // 4 quarter-cells over a 2000 ms bar -> ~500 ms per cell, so a handful of
    // samples reliably lands away from a boundary.
    let agreed = false;
    let lastCells: number[] = [];
    for (let attempt = 0; attempt < 12 && !agreed; attempt++) {
      const cells = await Promise.all(peers.map((p) => activeCell(p)));
      lastCells = cells;
      const allLit = cells.every((x) => x >= 0);
      const allEqual = cells.every((x) => x === cells[0]);
      if (allLit && allEqual) agreed = true;
      else await a.waitForTimeout(120);
    }

    expect(
      agreed,
      `peers never agreed on the mesh-clock bar cell; last sample = [${lastCells.join(", ")}] ` +
        `(the +500ms-skewed peer d is index 3 — a per-peer local timer would put it one cell off)`,
    ).toBe(true);
  } finally {
    await cleanup();
  }
});
