(() => {
  const root = document.documentElement;
  const base = root.dataset.candidateBase || "/candidate/v2.3.4";
  const discover = document.querySelector("[data-discover]");
  if (discover) {
    const cards = [...discover.querySelectorAll("[data-product-card]")];
    const load = document.querySelector("[data-load-more]");
    const category = document.querySelector("[data-category-filter]");
    const country = document.querySelector("[data-country-filter]");
    const reset = document.querySelector("[data-filter-reset]");
    let shown = 20;
    const render = () => {
      const matches = cards.filter((card) => (!category.value || card.dataset.category === category.value) && (!country.value || card.dataset.country === country.value));
      cards.forEach((card) => { card.hidden = true; });
      matches.slice(0, shown).forEach((card) => { card.hidden = false; });
      load.hidden = shown >= matches.length;
      document.querySelector("[data-result-count]").textContent = String(matches.length);
    };
    category.addEventListener("change", () => { shown = 20; render(); });
    country.addEventListener("change", () => { shown = 20; render(); });
    reset.addEventListener("click", () => { category.value = ""; country.value = ""; shown = 20; render(); });
    load.addEventListener("click", () => { shown += 20; render(); });
    render();
  }

  const searchForm = document.querySelector("[data-search-form]");
  if (searchForm) {
    const routes = JSON.parse(searchForm.dataset.routes || "{}");
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = new FormData(searchForm).get("q")?.toString().trim() || "";
      const slug = routes[query] || routes[query.toLowerCase()];
      location.href = slug ? `${base}/search/${slug}/` : `${base}/search/?q=${encodeURIComponent(query)}`;
    });
  }

  const form = document.querySelector("[data-intent-form]");
  if (!form) return;
  const status = document.querySelector("[data-form-status]");
  const submit = form.querySelector("button[type=submit]");
  const catalog = JSON.parse(document.querySelector("#intent-catalog")?.textContent || "{}");
  const productSelect = form.elements.productFamilyId;
  const params = new URLSearchParams(location.search);
  if (catalog.products?.[params.get("product")]) productSelect.value = params.get("product");
  if (["distribution", "procurement", "find_local_distributor", "brand_claim"].includes(params.get("intent"))) form.elements.intentType.value = params.get("intent");
  const updateSnapshots = () => {
    const product = catalog.products?.[productSelect.value];
    form.elements.productName.value = product?.productName || "";
    form.elements.brandId.value = product?.brandId || "";
    form.elements.brandName.value = product?.brandName || "";
  };
  productSelect.addEventListener("change", updateSnapshots);
  updateSnapshots();

  const isGithub = location.hostname.endsWith("github.io");
  const previewUrl = window.ZLG_CANDIDATE_PREVIEW_URL || "";
  if (isGithub) {
    submit.disabled = true;
    submit.textContent = "请在 Netlify Preview 提交";
    status.innerHTML = previewUrl ? `GitHub Review 为只读审查镜像。<a href="${previewUrl}${base}/intent/${location.search}">前往 Preview 表单</a>` : "GitHub Review 为只读审查镜像；真实提交仅在 Netlify Draft Preview 启用。";
    return;
  }

  const checkReceipt = async () => {
    const saved = sessionStorage.getItem("zlg-v234-intent-receipt");
    if (!saved) return;
    try {
      const receipt = JSON.parse(saved);
      const response = await fetch(`/api/candidate/business-intents/${encodeURIComponent(receipt.id)}?receipt=${encodeURIComponent(receipt.receipt)}`, { headers: { accept: "application/json" } });
      if (!response.ok) return;
      const persisted = await response.json();
      status.className = "form-status success";
      status.textContent = `已收到你的合作需求。提交编号：${persisted.id}（已验证持久化）`;
    } catch {}
  };
  checkReceipt();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "form-status";
    status.textContent = "正在安全提交…";
    submit.disabled = true;
    const raw = Object.fromEntries(new FormData(form).entries());
    raw.consent = form.elements.consent.checked;
    raw.sourcePage = location.pathname;
    raw.sourceQuery = params.get("sourceQuery") || "";
    try {
      const response = await fetch("/api/candidate/business-intents", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(raw) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.id || !result.receipt) throw new Error(result.message || "提交失败，请检查字段后重试。");
      sessionStorage.setItem("zlg-v234-intent-receipt", JSON.stringify({ id: result.id, receipt: result.receipt }));
      const verify = await fetch(`/api/candidate/business-intents/${encodeURIComponent(result.id)}?receipt=${encodeURIComponent(result.receipt)}`, { headers: { accept: "application/json" } });
      if (!verify.ok) throw new Error("提交已接收，但持久化校验失败，请稍后重试。");
      status.className = "form-status success";
      status.textContent = `已收到你的合作需求。提交编号：${result.id}`;
      form.reset();
      updateSnapshots();
    } catch (error) {
      status.className = "form-status error";
      status.textContent = error.message || "提交失败，请稍后重试。";
    } finally {
      submit.disabled = false;
    }
  });
})();
