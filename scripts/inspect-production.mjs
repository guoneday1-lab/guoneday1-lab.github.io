import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const runtime = process.env.ZLG_PLAYWRIGHT_HOME;
if (!runtime) throw new Error("ZLG_PLAYWRIGHT_HOME is required");
const { chromium } = require(path.join(runtime, "playwright", "index.js"));
const origin = "https://zlg-ai-platform-staging-20260816.netlify.app";
const browser = await chromium.launch({ headless:true, executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport:{ width:1366,height:900 } });
page.setDefaultTimeout(30_000);
const traffic=[];
page.on("request",request=>{
  const url=request.url();
  if(request.method()!=="GET"||/search|product|api/i.test(url)) traffic.push({method:request.method(),url,postData:request.postData()});
});

const productLinks = async()=>page.locator('a[href^="/products/"]').evaluateAll((links)=>[...new Set(links.map((link)=>link.getAttribute("href")))].filter(Boolean));
await page.goto(origin,{waitUntil:"networkidle"});
const initial=await productLinks();
const loadMore=page.getByRole("button",{name:/加载更多产品|Load more products/i});
let afterLoad=initial;
if(await loadMore.count()){
  await loadMore.click();
  await page.waitForTimeout(500);
  afterLoad=await productLinks();
}
const queries=process.argv.length>2?process.argv.slice(2):["酒店","清洁","warehouse AMR","安全","CRM software"];
const searches=[];
for(const query of queries){
  await page.goto(origin,{waitUntil:"networkidle"});
  await page.locator("#global-product-search").fill(query);
  const searchResponsePromise=page.waitForResponse((response)=>response.url().includes("/api/product-search")&&response.request().method()==="POST");
  await page.locator("form.search-instrument").evaluate((form)=>form.requestSubmit());
  const searchResponse=await searchResponsePromise;
  const searchPayload=await searchResponse.text();
  await page.getByRole("button",{name:/AI 搜索|AI Search/i}).waitFor();
  await page.waitForTimeout(250);
  searches.push({query,url:page.url(),status:searchResponse.status(),payload:JSON.parse(searchPayload),products:await productLinks(),text:(await page.locator("body").innerText()).slice(0,1200)});
}
console.log(JSON.stringify({title:await page.title(),initialCount:initial.length,afterLoadCount:afterLoad.length,initial,afterLoad,searches,traffic},null,2));
await browser.close();
