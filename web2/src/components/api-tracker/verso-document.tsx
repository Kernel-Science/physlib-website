"use client";

import { useEffect, useRef, useState } from "react";
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";

const published = new URL("https://jstoobysmith.github.io/PhyslibVerso/");
const allowed = new Set("section article div span p a em strong i b sub sup s br hr h1 h2 h3 h4 h5 h6 ul ol li dl dt dd pre code blockquote table thead tbody tr th td figure figcaption img details summary".split(" "));
function modulePath(url: URL) {
  if (url.origin !== published.origin || !url.pathname.startsWith(published.pathname)) return;
  const path = url.pathname.slice(published.pathname.length).replace(/\/(?:index\.html)?$/, "");
  if (!/^(Physlib|PhyslibAlpha)(\/[^/]+)*$/.test(path)) return;
  try { return decodeURIComponent(path); } catch { return; }
}

function safeURL(value: string, base: URL) {
  try {
    const url = new URL(value,base);
    if (url.protocol === "https:" || url.protocol === "http:") return url;
  } catch { /* An invalid source link is displayed as plain text. */ }
}

function articleDocument(html: string, page: URL) {
  const doc = new DOMParser().parseFromString(html,"text/html");
  const section = doc.querySelector<HTMLElement>("main.main-area .content-wrapper section.code-content");
  if (!section) throw new Error("The published page has no module article");
  const base = safeURL(doc.querySelector("base")?.getAttribute("href") ?? page.href,page);
  const sourceBase = base?.origin === published.origin ? base : page;
  section.querySelectorAll("script,style,link,meta,base,form,input,button,iframe,object,embed,svg,math,template,nav,.tactic-state").forEach(e => e.remove());
  // Rebuild the attributes from an allowlist before the article enters a browsing
  // context. Only the local reader interprets module links or renders math.
  for (const el of [section,...section.querySelectorAll("*")]) {
    if (!allowed.has(el.localName)) { el.replaceWith(...el.childNodes); continue; }
    const href = el.getAttribute("href"), src = el.getAttribute("src");
    for (const attr of [...el.attributes]) {
      if (!["id","class","title","alt","colspan","rowspan","start","open"].includes(attr.name)) el.removeAttribute(attr.name);
    }
    if (el.localName === "a" && href) {
      const url = safeURL(href,href.startsWith("#") ? page : sourceBase);
      if (!url) continue;
      el.setAttribute("href",url.href);
      el.setAttribute("target","_blank");
      el.setAttribute("rel","noopener noreferrer");
      if (url.hash && modulePath(url) === modulePath(page)) el.setAttribute("data-anchor",url.hash.slice(1));
    }
    if (el.localName === "img" && src) {
      const url = safeURL(src,sourceBase);
      if (url?.origin === published.origin) el.setAttribute("src",url.href);
    }
  }
  for (const math of section.querySelectorAll<HTMLElement>(".math.inline, .math.display")) {
    katex.render(math.textContent ?? "",math,{displayMode:math.classList.contains("display"),throwOnError:false,trust:false});
  }
  for (const prose of section.querySelectorAll<HTMLElement>(".md-text,.verso-text")) {
    renderMathInElement(prose, {throwOnError:false,trust:false,ignoredClasses:["katex","math"],
      delimiters:[{left:"$$",right:"$$",display:true},{left:"\\[",right:"\\]",display:true},{left:"\\(",right:"\\)",display:false},{left:"$",right:"$",display:false}]});
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://jstoobysmith.github.io; img-src https://jstoobysmith.github.io; font-src https://jstoobysmith.github.io 'self'; form-action 'none'; base-uri 'none'">
    <link rel="stylesheet" href="${published.href}katex/katex.css"><style>${readerStyle}</style>
    </head><body>${section.outerHTML}</body></html>`;
}

const readerStyle = `
  @font-face{font-family:Geist;src:url(/fonts/geist-latin.woff2)} @font-face{font-family:GeistMono;src:url(/fonts/geist-mono-latin.woff2)}
  :root{--ink:#20272d;--link:#245e98;--line:#dce3ea;--code:#f5f7fa;--kw:#773c88;--ident:#175e7b;color-scheme:light}
  :root[data-theme="dark"]{--ink:#e4e8ed;--link:#91c8ff;--line:#34404e;--code:#141d27;--kw:#e3a1ee;--ident:#96ccdb;color-scheme:dark}
  *{box-sizing:border-box}html,body{margin:0;background:transparent;color:var(--ink)}
  body{font:1rem/1.6 Geist,system-ui,sans-serif;overflow-wrap:break-word}.code-content{display:flow-root}
  a{color:var(--link);text-underline-offset:.15em}a:focus-visible,summary:focus-visible{outline:2px solid var(--link);outline-offset:2px}
  h1,h2,h3,h4{line-height:1.25;letter-spacing:-.02em;margin:1.35em 0 .5em}h1,h2{font-size:1.55rem}p,ul,ol{margin:.65em 0 1em}
  code,pre{font-family:GeistMono,ui-monospace,monospace;font-size:.87em}
  .code-box,.imports-code,pre{overflow:auto;background:var(--code);border:1px solid var(--line);border-radius:.3rem;margin:1em 0;padding:.8em 1em}
  .hl.block{white-space:pre;display:block;line-height:1.55;tab-size:2;width:max-content;min-width:100%;overflow-wrap:normal}
  .hl a{text-decoration:none}.hl a:hover{text-decoration:underline}.keyword{color:var(--kw)}.const,.type,.var{color:var(--ident)}
  .comment{opacity:.72}.imports-list{margin:0 0 1em;border-bottom:1px solid var(--line);padding:.4em 0 .7em}summary{cursor:pointer}
  .katex-display{overflow-x:auto;overflow-y:hidden;padding:.2em 0}img{max-width:100%;height:auto}table{display:block;overflow:auto;border-collapse:collapse}
  td,th{border:1px solid var(--line);padding:.25em .55em}
`;

function decodedAnchor(fragment: string) {
  try { return decodeURIComponent(fragment); } catch { return fragment; }
}

function scrollToAnchor(iframe: HTMLIFrameElement | null, fragment: string) {
  const doc = iframe?.contentDocument, host = iframe?.ownerDocument.defaultView;
  if (!iframe || !doc || !host || !fragment) return;
  const id = decodedAnchor(fragment);
  const target = doc.getElementById(id) ?? doc.getElementById(id.replaceAll(".","___"));
  if (!target) return;
  const header = iframe.ownerDocument.querySelector(".docs-site-header");
  const top = host.scrollY + iframe.getBoundingClientRect().top + target.getBoundingClientRect().top;
  host.scrollTo({top:top-(header?.getBoundingClientRect().height ?? 0)-12,behavior:"instant"});
}

export default function VersoDocument({href,title}: {href:string;title:string}) {
  const page = href.split("#")[0], anchor = href.slice(page.length+1);
  const [result,setResult] = useState<{page:string;html?:string}>();
  const frame = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => { scrollToAnchor(frame.current,anchor); },[page,anchor]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const url = new URL(page);
      if (!modulePath(url)) throw new Error("Unknown module origin");
      const response = await fetch(url,{signal:controller.signal,credentials:"omit",referrerPolicy:"no-referrer"});
      if (!response.ok || !modulePath(new URL(response.url))) throw new Error("The published article is unavailable");
      const content = articleDocument(await response.text(),url);
      if (!controller.signal.aborted) setResult({page,html:content});
    }
    load().catch(() => { if (!controller.signal.aborted) setResult({page}); });
    return () => { controller.abort(); cleanup.current(); };
  },[page]);

  function attach() {
    cleanup.current();
    const iframe = frame.current, doc = iframe?.contentDocument;
    const hostDocument = iframe?.ownerDocument, host = hostDocument?.defaultView;
    if (!iframe || !doc?.body.firstElementChild || !hostDocument || !host) return;
    const fit = () => { iframe.style.height = Math.ceil(doc.body.getBoundingClientRect().height)+2+"px"; };
    const theme = () => { doc.documentElement.dataset.theme = hostDocument.documentElement.dataset.theme ?? "light"; };
    theme(); fit();
    const size = new ResizeObserver(fit), appearance = new MutationObserver(theme);
    size.observe(doc.body);
    appearance.observe(hostDocument.documentElement,{attributes:true,attributeFilter:["data-theme"]});

    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-anchor]");
      const fragment = link?.dataset.anchor;
      if (!fragment) return;
      event.preventDefault();
      const url = new URL(host.location.href);
      // Prefer the native declaration spelling when one exists, so the other
      // view of the module can follow the same bookmarked anchor.
      const id = decodedAnchor(fragment), native = id.replaceAll("___",".");
      url.hash = hostDocument.getElementById(native) ? native : id;
      if (url.href !== host.location.href) {
        const oldURL = host.location.href;
        host.history.pushState(host.history.state,"",url);
        host.dispatchEvent(new HashChangeEvent("hashchange",{oldURL,newURL:url.href}));
      }
      scrollToAnchor(iframe,fragment);
    };
    const followHash = () => scrollToAnchor(iframe,host.location.hash.slice(1));
    doc.addEventListener("click",click);
    host.addEventListener("hashchange",followHash);
    scrollToAnchor(iframe,anchor || host.location.hash.slice(1));
    cleanup.current = () => {
      size.disconnect(); appearance.disconnect();
      doc.removeEventListener("click",click); host.removeEventListener("hashchange",followHash);
    };
  }

  if (result?.page !== page) return <p role="status">Loading the Verso article…</p>;
  if (!result.html) {
    const valid = safeURL(href,published);
    return <p role="status">The Verso article could not be loaded.
      {valid && modulePath(valid) && <> <a href={valid.href} target="_blank" rel="noopener noreferrer">Open the published article ↗</a></>}</p>;
  }
  return <iframe key={page} ref={frame} title={title} srcDoc={result.html}
    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" onLoad={attach}
    style={{display:"block",width:"100%",minHeight:"12rem",border:0}}/>;
}
