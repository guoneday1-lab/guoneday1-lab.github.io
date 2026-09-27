const PRODUCTION_DEPLOY = "6ab13e2d0dcd7f64cb3a69bf";
const SOURCE_VERSION = "V2.3.3";
const PRODUCTION_SITE = "zlg-ai-platform-staging-20260816.netlify.app";
const PRODUCTION_ORIGIN = `https://${PRODUCTION_DEPLOY}--${PRODUCTION_SITE}`;
const PUBLIC_PRODUCTION_URL = `https://${PRODUCTION_SITE}/`;
const REVIEW_SEARCH_PATH = "/__review/search";
const SEARCH_API_PATH = "/api/product-search";
const MAX_QUERY_LENGTH = 160;

const htmlEscape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

function reviewHeaders(headers = new Headers()) {
  const next = new Headers(headers);
  next.set("x-zlg-review", "true");
  next.set("x-zlg-review-source-version", SOURCE_VERSION);
  next.set("x-zlg-review-production-deploy", PRODUCTION_DEPLOY);
  next.set("x-content-type-options", "nosniff");
  next.set("referrer-policy", "strict-origin-when-cross-origin");
  next.set("x-robots-tag", "all");
  next.set("access-control-allow-origin", "*");
  next.delete("set-cookie");
  next.delete("content-length");
  next.delete("content-encoding");
  return next;
}

function jsonResponse(value, status = 200, extraHeaders) {
  const headers = reviewHeaders(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(value, null, 2), { status, headers });
}

function textResponse(value, status = 200, contentType = "text/plain; charset=utf-8") {
  const headers = reviewHeaders();
  headers.set("content-type", contentType);
  headers.set("cache-control", "no-store");
  return new Response(value, { status, headers });
}

async function readSearchQuery(request, url) {
  if (request.method === "GET" || request.method === "HEAD") {
    return (url.searchParams.get("query") ?? url.searchParams.get("q") ?? "").trim();
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await request.json();
    return typeof payload?.query === "string" ? payload.query.trim() : "";
  }
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return String(form.get("query") ?? form.get("q") ?? "").trim();
  }
  return "";
}

function validateQuery(query) {
  if (!query) return "A search query is required.";
  if (query.length > MAX_QUERY_LENGTH) return `Search queries must be ${MAX_QUERY_LENGTH} characters or fewer.`;
  return null;
}

async function runProductionSearch(query) {
  const response = await fetch(`${PRODUCTION_ORIGIN}${SEARCH_API_PATH}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "ZLG-Public-Review/2.3.3",
      "x-zlg-review": "true",
    },
    body: JSON.stringify({ query, sessionId: crypto.randomUUID() }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Production search returned ${response.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}

function productSummary(product) {
  const headquarters = product.brandHeadquartersCountry?.value || "待核实 / Unverified";
  const tasks = product.decision?.fields?.tasks?.summary?.zh || "待品牌确认";
  const scenarios = product.decision?.fields?.confirmedScenarios?.summary?.zh || "待品牌确认";
  const reasons = Array.isArray(product.match?.reasons) ? product.match.reasons : [];
  const source = product.sources?.[0];
  return `<article class="result-card">
    <p class="eyebrow">${htmlEscape(product.category || product.localizedProductType || "Physical AI")}</p>
    <h2><a href="/products/${encodeURIComponent(product.slug)}">${htmlEscape(product.brandName)} · ${htmlEscape(product.productName)}</a></h2>
    <dl>
      <div><dt>品牌总部 / Headquarters</dt><dd>${htmlEscape(headquarters)}</dd></div>
      <div><dt>已核实任务 / Verified tasks</dt><dd>${htmlEscape(tasks)}</dd></div>
      <div><dt>官方场景 / Official scenarios</dt><dd>${htmlEscape(scenarios)}</dd></div>
      <div><dt>匹配层级 / Match tier</dt><dd>${htmlEscape(product.match?.tier || "unknown")}</dd></div>
    </dl>
    ${reasons.length ? `<p>${reasons.map(htmlEscape).join(" · ")}</p>` : ""}
    <p class="links"><a href="/products/${encodeURIComponent(product.slug)}">产品详情 / Product detail</a>${source?.url ? ` · <a href="${htmlEscape(source.url)}" rel="noreferrer">官方来源 / Official source</a>` : ""}</p>
  </article>`;
}

function renderSearchPage(query, payload) {
  const products = Array.isArray(payload.products) ? payload.products : [];
  const stats = payload.indexStats ?? {};
  const physicalNotice = payload.isPhysicalAI === false
    ? "当前查询不属于 Physical AI；Search V3.2 未生成无关产品。"
    : "结果来自 Production Product Graph 与 Search V3.2，只读返回。";
  const empty = products.length === 0
    ? `<section class="empty"><h2>0 个相关产品家族</h2><p>${htmlEscape(payload.interpretation || physicalNotice)}</p><p>没有可靠证据时不填充无关产品。</p></section>`
    : products.map(productSummary).join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow">
  <meta name="zlg-review" content="true"><meta name="zlg-review-source-version" content="${SOURCE_VERSION}"><meta name="zlg-review-production-deploy" content="${PRODUCTION_DEPLOY}">
  <title>${htmlEscape(query)}｜ZLG Public Review Search</title>
  <style>:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#10243e;background:#f4f7fb}*{box-sizing:border-box}body{margin:0}a{color:#0568d9}header{padding:22px clamp(18px,5vw,64px);color:#fff;background:#061b37}header nav{display:flex;align-items:center;justify-content:space-between;gap:18px}header a{color:#fff}main{width:min(1180px,calc(100% - 32px));margin:32px auto 64px}.summary,.result-card,.empty{padding:22px;background:#fff;border:1px solid #dbe5ef;border-radius:10px}.summary{margin-bottom:16px}.summary h1{margin:6px 0 10px;font-size:clamp(25px,4vw,42px)}.meta{display:flex;flex-wrap:wrap;gap:8px}.meta span,.eyebrow{font-size:13px;color:#41617f}.meta span{padding:7px 10px;background:#eef5fc;border-radius:999px}.results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.result-card h2{margin:5px 0 15px;font-size:20px}.result-card dl{margin:0;display:grid;gap:8px}.result-card dl div{display:grid;grid-template-columns:minmax(150px,.7fr) minmax(0,1fr);gap:12px}.result-card dt{color:#5a7087}.result-card dd{margin:0;font-weight:650}.links{margin-bottom:0}.empty{grid-column:1/-1}footer{padding:22px;text-align:center;color:#5a7087}@media(max-width:720px){.results{grid-template-columns:1fr}.result-card dl div{grid-template-columns:1fr;gap:2px}}</style>
</head>
<body>
<!-- ZLG Review | Source Version: ${SOURCE_VERSION} | Production Deploy: ${PRODUCTION_DEPLOY} -->
<header><nav><strong>ZLG Public Review</strong><a href="/">打开完整产品发现页面</a></nav></header>
<main><section class="summary"><p class="eyebrow">SEARCH V3.2 · REAL PRODUCTION DATA · READ ONLY</p><h1>“${htmlEscape(query)}”</h1><p>${htmlEscape(payload.interpretation || physicalNotice)}</p><p>${htmlEscape(physicalNotice)}</p><div class="meta"><span>结果 ${htmlEscape(payload.count ?? products.length)}</span><span>产品索引 ${htmlEscape(stats.productCount ?? "—")}</span><span>产品家族 ${htmlEscape(stats.familyCount ?? "—")}</span><span>品牌 ${htmlEscape(stats.brandCount ?? "—")}</span><span>总部国家 ${htmlEscape(stats.countryCount ?? "—")}</span><span>更新 ${htmlEscape(stats.lastUpdatedAt ?? "—")}</span><span>Provider ${htmlEscape(payload.provider ?? "—")}</span></div></section><section class="results" aria-label="Search results">${empty}</section></main>
<footer>Source ${SOURCE_VERSION} · Production Deploy ${PRODUCTION_DEPLOY} · No mock products</footer>
</body></html>`;
}

function injectReviewMetadata(html) {
  const marker = `<!-- ZLG Review | Source Version: ${SOURCE_VERSION} | Production Deploy: ${PRODUCTION_DEPLOY} -->`;
  const meta = `<meta name="zlg-review" content="true"><meta name="zlg-review-source-version" content="${SOURCE_VERSION}"><meta name="zlg-review-production-deploy" content="${PRODUCTION_DEPLOY}">`;
  return html.includes("</head>") ? html.replace("</head>", `${meta}${marker}</head>`) : `${marker}${html}`;
}

function rewriteLocation(location, requestUrl) {
  if (!location) return null;
  const reviewOrigin = new URL(requestUrl).origin;
  return location.replace(PRODUCTION_ORIGIN, reviewOrigin).replace(PUBLIC_PRODUCTION_URL.slice(0, -1), reviewOrigin);
}

async function proxyReadRequest(request) {
  const incoming = new URL(request.url);
  const upstream = new URL(`${incoming.pathname}${incoming.search}`, PRODUCTION_ORIGIN);
  const headers = new Headers(request.headers);
  for (const name of ["authorization", "cookie", "host", "x-forwarded-host", "x-forwarded-proto", "cf-connecting-ip", "cf-ipcountry", "cf-ray"]) headers.delete(name);
  headers.set("user-agent", request.headers.get("user-agent") || "ZLG-Public-Review/2.3.3");
  headers.set("x-zlg-review", "true");
  const upstreamResponse = await fetch(upstream, { method:request.method, headers, redirect:"manual" });
  const responseHeaders = reviewHeaders(upstreamResponse.headers);
  const location = rewriteLocation(responseHeaders.get("location"), request.url);
  if (location) responseHeaders.set("location", location);
  const contentType = upstreamResponse.headers.get("content-type") ?? "";
  if (request.method !== "HEAD" && contentType.includes("text/html")) {
    responseHeaders.set("content-type", "text/html; charset=utf-8");
    responseHeaders.set("cache-control", "public, max-age=60");
    return new Response(injectReviewMetadata(await upstreamResponse.text()), { status:upstreamResponse.status, headers:responseHeaders });
  }
  return new Response(request.method === "HEAD" ? null : upstreamResponse.body, { status:upstreamResponse.status, headers:responseHeaders });
}

async function searchApiResponse(request, url) {
  const query = await readSearchQuery(request, url);
  const error = validateQuery(query);
  if (error) return jsonResponse({ error }, 400);
  try { return jsonResponse(await runProductionSearch(query)); }
  catch (cause) { return jsonResponse({ error:"Production search is temporarily unavailable.", detail:String(cause?.message || cause) }, 502); }
}

async function searchPageResponse(request, url) {
  const query = await readSearchQuery(request, url);
  const error = validateQuery(query);
  if (error) return textResponse(error, 400, "text/html; charset=utf-8");
  try {
    const headers = reviewHeaders();
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=60");
    return new Response(renderSearchPage(query, await runProductionSearch(query)), { status:200, headers });
  } catch (cause) {
    return textResponse(`Production search is temporarily unavailable: ${String(cause?.message || cause)}`, 502, "text/html; charset=utf-8");
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      const headers = reviewHeaders();
      headers.set("access-control-allow-methods", "GET, HEAD, POST, OPTIONS");
      headers.set("access-control-allow-headers", "content-type");
      return new Response(null, { status:204, headers });
    }
    if (url.pathname === "/robots.txt") {
      if (!new Set(["GET", "HEAD"]).has(request.method)) return textResponse("Method not allowed", 405);
      return textResponse("User-agent: *\nAllow: /\n", 200);
    }
    if (url.pathname === "/__review/health") {
      if (!new Set(["GET", "HEAD"]).has(request.method)) return textResponse("Method not allowed", 405);
      return jsonResponse({ status:"READY", review:"ZLG Review", sourceVersion:SOURCE_VERSION, productionDeploy:PRODUCTION_DEPLOY, productionUrl:PUBLIC_PRODUCTION_URL, readOnly:true });
    }
    if (url.pathname === REVIEW_SEARCH_PATH) {
      if (!new Set(["GET", "HEAD", "POST"]).has(request.method)) return textResponse("Method not allowed", 405);
      return searchPageResponse(request, url);
    }
    if (url.pathname === SEARCH_API_PATH) {
      if (!new Set(["GET", "HEAD", "POST"]).has(request.method)) return textResponse("Method not allowed", 405);
      return searchApiResponse(request, url);
    }
    if (!new Set(["GET", "HEAD"]).has(request.method)) {
      return jsonResponse({ error:"Review environment is read-only.", allowed:["GET", "HEAD", `POST ${SEARCH_API_PATH}`, `POST ${REVIEW_SEARCH_PATH}`] }, 405, new Headers({ allow:"GET, HEAD" }));
    }
    try { return await proxyReadRequest(request); }
    catch (cause) { return jsonResponse({ error:"Production source is temporarily unavailable.", detail:String(cause?.message || cause) }, 502); }
  },
};

export { PRODUCTION_DEPLOY, SOURCE_VERSION, PRODUCTION_ORIGIN, renderSearchPage };
