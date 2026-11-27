// Usage: node scripts/build-roadmap-previews.mjs [local site URL] [output directory]
// Start the website first. CHROME_BIN can select any installed Chromium executable.
import { spawn } from "node:child_process";
import { EventEmitter, once } from "node:events";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import WebSocket from "next/dist/compiled/ws/index.js";
import sharp from "sharp";

const url = new URL("/globe", process.argv[2] ?? "http://127.0.0.1:3000").href;
const output = process.argv[3] ? resolve(process.argv[3]) : fileURLToPath(new URL("../public/roadmap-view/", import.meta.url));
const chrome = process.env.CHROME_BIN || (process.platform === "darwin"
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const profile = await mkdtemp(join(tmpdir(), "physlib-roadmap-preview-"));
const imageSize = 1100;
const padding = 15;
const transparent = "#00000000";

// This function runs in the site tab. Keep the exact live geometry, typography
// and colors; the surrounding hero supplies the background under the chart.
async function prepare(theme) {
  const until = performance.now() + 60_000;
  let svg;
  while (performance.now() < until) {
    svg = document.querySelector("svg[data-atlas-plot]");
    if (document.documentElement.dataset.theme === theme && svg?.querySelector("g[data-tile]")) break;
    svg = undefined;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!svg) throw Error("Timed out waiting for the rendered " + theme + " Globe");
  await document.fonts.ready;
  for (let element = svg; element; element = element.parentElement) {
    element.style.setProperty("background", "transparent", "important");
  }
  const gaps = svg.querySelector('g[stroke="var(--surface)"][fill="none"]');
  if (!gaps) throw Error("Cannot identify the active roadmap's subject separators");
  // Cut out the same separator strokes the website paints in its surface color.
  const make = tag => document.createElementNS(svg.namespaceURI, tag);
  const defs = make("defs"), mask = make("mask"), keep = make("rect"), drawing = make("g");
  const box = svg.viewBox.baseVal;
  mask.id = "homepage-roadmap-gaps";
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  keep.setAttribute("fill", "white");
  for (const key of ["x", "y", "width", "height"]) {
    keep.setAttribute(key, box[key]);
    mask.setAttribute(key, box[key]);
  }
  gaps.setAttribute("stroke", "black");
  mask.append(keep, gaps);
  defs.append(mask);
  drawing.setAttribute("mask", "url(#homepage-roadmap-gaps)");
  while (svg.firstChild) drawing.append(svg.firstChild);
  svg.append(defs, drawing);
  const bounds = drawing.getBBox(), toScreen = svg.getScreenCTM();
  // The full Globe is centered at the SVG origin, independent of the bounds
  // reported for individual sectors and labels.
  const center = new DOMPoint(0, 0).matrixTransform(toScreen);
  const radius = Math.max(-bounds.x, bounds.x + bounds.width, -bounds.y, bounds.y + bounds.height);
  const size = Math.ceil(2 * radius * toScreen.a * 1.08);
  return {x: Math.round(center.x + scrollX - size/2), y: Math.round(center.y + scrollY - size/2), width:size, height:size, scale:1};
}

const child = spawn(chrome, ["--headless=new", "--disable-dev-shm-usage", "--disable-background-networking",
  "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"],
{stdio:"ignore"});
let launchError;
child.on("error", error => { launchError = error; });
let socket;
try {
  let port;
  for (let retry = 0; !port && retry < 200; retry++) {
    if (launchError) throw launchError;
    if (child.exitCode !== null) throw Error("Chrome exited before opening its debugging port");
    const address = await readFile(join(profile,"DevToolsActivePort"),"utf8").catch(error => {
      if (error.code !== "ENOENT") throw error;
      return "";
    });
    port = address.split("\n")[0];
    if (!port) await delay(100);
  }
  if (!port) throw Error("Timed out starting Chrome; check CHROME_BIN");
  const targets = await fetch("http://127.0.0.1:" + port + "/json/list").then(response => response.json());
  const page = targets.find(target => target.type === "page");
  if (!page) throw Error("Chrome did not expose a page target");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await once(socket,"open");
  let id = 0;
  const events = new EventEmitter();
  socket.on("message", data => {
    const message = JSON.parse(data);
    events.emit(message.id ? "reply:" + message.id : message.method, message);
  });
  async function command(method, params = {}) {
    const requestId = ++id;
    const reply = once(events,"reply:" + requestId,{signal:AbortSignal.timeout(70_000)});
    socket.send(JSON.stringify({id:requestId, method, params}));
    const [message] = await reply;
    if (message.error) throw Error(method + ": " + message.error.message);
    return message.result;
  }
  await command("Page.enable");
  await command("Emulation.setDeviceMetricsOverride",{width:1664,height:1240,deviceScaleFactor:2,mobile:false});
  await command("Emulation.setDefaultBackgroundColorOverride",{color:{r:0,g:0,b:0,a:0}});
  const previews = new Map();
  const variants = [
    {name:"home-light", theme:"light"},
    {name:"home-dark", theme:"dark"},
  ];
  for (const {name,theme} of variants) {
    const previewUrl = new URL(url);
    const init = await command("Page.addScriptToEvaluateOnNewDocument",{source:`localStorage.setItem("theme",${JSON.stringify(theme)})`});
    const loaded = once(events,"Page.loadEventFired",{signal:AbortSignal.timeout(60_000)});
    await command("Page.navigate",{url:previewUrl.href});
    await loaded;
    const clip = await command("Runtime.evaluate",{expression:`(${prepare.toString()})(${JSON.stringify(theme)})`,awaitPromise:true,returnByValue:true});
    if (clip.exceptionDetails) throw Error(clip.exceptionDetails.exception?.description ?? "The chart could not be captured");
    const {data} = await command("Page.captureScreenshot",{format:"png",clip:clip.result.value,captureBeyondViewport:true});
    const artworkSize = imageSize - 2 * padding;
    const bitmap = sharp(Buffer.from(data,"base64"))
      .trim({background:transparent,threshold:1})
      .resize(artworkSize,artworkSize,{fit:"contain",background:transparent})
      .extend({top:padding,bottom:padding,left:padding,right:padding,background:transparent});
    previews.set(name,await bitmap.webp({quality:80,alphaQuality:92,smartSubsample:true,effort:6}).toBuffer());
    await command("Page.removeScriptToEvaluateOnNewDocument",{identifier:init.identifier});
  }
  for (const [variant,image] of previews) {
    const name = join(output,variant + ".webp");
    const temporary = name + "." + process.pid + ".tmp";
    try {
      await writeFile(temporary,image);
      await rename(temporary,name);
    } finally { await rm(temporary,{force:true}); }
    console.log(name + " (" + image.length.toLocaleString("en-US") + " bytes)");
  }
} finally {
  socket?.close();
  if (child.pid && child.exitCode === null && child.signalCode === null) {
    const exited = once(child,"exit");
    child.kill();
    await exited;
  }
  await rm(profile,{recursive:true,force:true,maxRetries:3});
}
