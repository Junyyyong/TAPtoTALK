import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const [url, output, expression = ""] = process.argv.slice(2);
if (!url || !output) throw new Error("usage: node capture-mobile.mjs URL OUTPUT [EXPRESSION]");

const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--no-default-browser-check", `--remote-debugging-port=${port}`, "about:blank",
], { stdio: "ignore" });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let page;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      page = tabs.find((tab) => tab.type === "page");
      if (page) break;
    } catch {}
    await delay(100);
  }
  if (!page) throw new Error("Chrome DevTools page was not available");

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
    screenWidth: 390, screenHeight: 844,
  });
  await send("Page.navigate", { url });
  await delay(Number(process.env.CAPTURE_DELAY_MS ?? 8500));
  if (expression) {
    const evaluated = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (evaluated.exceptionDetails) throw new Error(JSON.stringify(evaluated.exceptionDetails));
    await delay(900);
  }
  const { data } = await send("Page.captureScreenshot", {
    format: "png", fromSurface: true, captureBeyondViewport: false,
  });
  await writeFile(output, Buffer.from(data, "base64"));
} finally {
  socket?.close();
  chrome.kill("SIGTERM");
}
