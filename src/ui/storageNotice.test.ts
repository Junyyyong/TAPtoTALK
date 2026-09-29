import { afterEach, expect, it, vi } from "vitest";
import { StorageNotice } from "./storageNotice";

function setup() {
  const app = { inert: false };
  const elements: any[] = [];
  vi.stubGlobal("document", {
    createElement: () => {
      const classes = new Set<string>();
      const e = {
        hidden: false, disabled: false, textContent: "", onclick: undefined,
        setAttribute: vi.fn(), append: vi.fn(), focus: vi.fn(),
        classList: { toggle: (name: string, on: boolean) => on ? classes.add(name) : classes.delete(name),
          remove: (name: string) => classes.delete(name), contains: (name: string) => classes.has(name) },
      };
      elements.push(e); return e;
    },
    body: { append: vi.fn() }, getElementById: () => app,
  });
  const notice = new StorageNotice();
  return { notice, app, panel: elements[0], retry: elements[2] };
}
afterEach(() => vi.unstubAllGlobals());
it("successful blocking Retry clears the hidden overlay and app inert state", async () => {
  const {notice, app, panel, retry} = setup();
  notice.show(true, async () => notice.hide());
  expect(app.inert).toBe(true);
  expect(panel.classList.contains("storage-blocking")).toBe(true);
  await retry.onclick();
  expect(panel.hidden).toBe(true);
  expect(panel.classList.contains("storage-blocking")).toBe(false);
  expect(app.inert).toBe(false);
  expect(retry.disabled).toBe(false);
});
it("a failed Retry keeps recovery visible, preserves blocking and allows retrying", async () => {
  const {notice, app, panel, retry} = setup();
  notice.show(true, async () => { throw Error("storage unavailable"); });
  await retry.onclick();
  expect(panel.hidden).toBe(false); expect(app.inert).toBe(true);
  expect(retry.disabled).toBe(false);
});
it("a later write notice does not inherit the recovered load notice's blocker", () => {
  const {notice, app, panel} = setup();
  notice.show(true, async () => {}); notice.hide();
  notice.show(false, async () => {});
  expect(panel.hidden).toBe(false); expect(app.inert).toBe(false);
  expect(panel.classList.contains("storage-blocking")).toBe(false);
});
