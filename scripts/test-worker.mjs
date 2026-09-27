import assert from "node:assert/strict";
import worker, { PRODUCTION_DEPLOY, SOURCE_VERSION } from "../worker/index.js";

const call = (path, init={}) => worker.fetch(new Request(`https://review.local${path}`, init));
const home=await call("/");
if (home.status !== 200) console.error(await home.clone().text());
assert.equal(home.status,200);assert.equal(home.headers.get("x-zlg-review"),"true");assert.equal(home.headers.get("x-zlg-review-source-version"),SOURCE_VERSION);assert.equal(home.headers.get("x-zlg-review-production-deploy"),PRODUCTION_DEPLOY);
const homeHtml=await home.text();for(const text of ["ZLG","Physical AI","搜索","zlg-review-source-version"]) assert.match(homeHtml,new RegExp(text,"i"));
const searchGet=await call("/api/product-search?query=%E6%B8%85%E6%B4%81");assert.equal(searchGet.status,200);const searchPayload=await searchGet.json();assert.equal(searchPayload.provider,"zlg_index");assert.equal(searchPayload.indexStats.productCount,357);assert.equal(searchPayload.products.some((product)=>product.slug==="gausium-phantas"),true);
const searchPost=await call("/api/product-search",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:"warehouse AMR"})});assert.equal(searchPost.status,200);assert.equal((await searchPost.json()).provider,"zlg_index");
const readableSearch=await call("/__review/search?q=CRM%20software");assert.equal(readableSearch.status,200);const readableHtml=await readableSearch.text();assert.match(readableHtml,/Physical AI/);assert.match(readableHtml,/No mock products/);
const detail=await call("/products/karcher-kira-b-50");assert.equal(detail.status,200);assert.match(await detail.text(),/KIRA B 50/i);
const missing=await call("/products/not-a-real-zlg-product");assert.equal(missing.status,404);
const robots=await call("/robots.txt");assert.equal(robots.status,200);assert.match(await robots.text(),/Allow: \/$/m);
const blocked=await call("/api/not-a-write",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});assert.equal(blocked.status,405);
console.log(JSON.stringify({passed:8,sourceVersion:SOURCE_VERSION,productionDeploy:PRODUCTION_DEPLOY,productCount:searchPayload.indexStats.productCount,familyCount:searchPayload.indexStats.familyCount},null,2));
