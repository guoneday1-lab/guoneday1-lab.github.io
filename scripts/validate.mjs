import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("public");

async function requireFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  await access(absolutePath);
  return absolutePath;
}

const requiredFiles = [
  "index.html",
  "404.html",
  "robots.txt",
  ".nojekyll",
  "review-manifest.json",
  "review/discover/index.html",
  "review/filter/headquarters/index.html",
  "data/products.json",
  "data/brands.json",
  "data/headquarters.json",
];

await Promise.all(requiredFiles.map(requireFile));

const manifest = JSON.parse(
  await readFile(path.join(root, "review-manifest.json"), "utf8"),
);

const expected = {
  publicProducts: 357,
  publicFamilies: 284,
  publicBrands: 79,
  verifiedHeadquartersBrands: 56,
  countries: 19,
};

for (const [key, value] of Object.entries(expected)) {
  if (manifest[key] !== value) {
    throw new Error(
      `Manifest mismatch for ${key}: expected ${value}, received ${manifest[key]}`,
    );
  }
}

if (manifest.version !== "V2.3.3") {
  throw new Error(`Unexpected source version: ${manifest.version}`);
}

if (manifest.sourceProductionDeploy !== "6ab13e2d0dcd7f64cb3a69bf") {
  throw new Error(
    `Unexpected production deploy: ${manifest.sourceProductionDeploy}`,
  );
}

const searchSlugs = [
  "hotel",
  "hospital",
  "warehouse",
  "cleaning",
  "delivery",
  "inspection",
  "humanoid",
  "quadruped",
  "warehouse-amr",
  "security",
  "crm-software",
];

await Promise.all(
  searchSlugs.flatMap((slug) => [
    requireFile(`review/search/${slug}/index.html`),
    requireFile(`data/search/${slug}.json`),
  ]),
);

const productDirectories = await readdir(path.join(root, "review", "product"), {
  withFileTypes: true,
});
const productPageCount = productDirectories.filter((entry) => entry.isDirectory()).length;

if (productPageCount !== 284) {
  throw new Error(
    `Unexpected product page count: expected 284, received ${productPageCount}`,
  );
}

const homeHtml = await readFile(path.join(root, "index.html"), "utf8");
for (const marker of ["ZLG", "Physical AI", "ZLG Public Review", "V2.3.3"]) {
  if (!homeHtml.includes(marker)) {
    throw new Error(`Home HTML is missing required marker: ${marker}`);
  }
}

console.log(
  `Validated ZLG Public Review ${manifest.version}: ${productPageCount} product pages, ${searchSlugs.length} search snapshots.`,
);
