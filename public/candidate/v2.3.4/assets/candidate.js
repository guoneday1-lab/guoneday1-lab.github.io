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
  const productField = form.elements.productFamilyId;
  const params = new URLSearchParams(location.search);
  if (["distribution", "procurement", "find_local_distributor", "brand_claim"].includes(params.get("intent"))) form.elements.intentType.value = params.get("intent");
  const picker = document.querySelector("[data-product-picker]");
  const pickerSearch = document.querySelector("[data-product-search]");
  const pickerResults = document.querySelector("[data-product-results]");
  const pickerEmpty = document.querySelector("[data-product-empty]");
  const openPicker = document.querySelector("[data-open-product-picker]");
  const closePicker = document.querySelector("[data-close-product-picker]");
  const productName = document.querySelector("[data-selected-product-name]");
  const productBrand = document.querySelector("[data-selected-product-brand]");
  const productCategory = document.querySelector("[data-selected-product-category]");
  const products = Object.entries(catalog.products || {}).map(([id, product]) => ({ id, ...product }));

  const updateSnapshots = () => {
    const product = catalog.products?.[productField.value];
    form.elements.productName.value = product?.productName || "";
    form.elements.brandId.value = product?.brandId || "";
    form.elements.brandName.value = product?.brandName || "";
    productName.textContent = product?.productName || "尚未选择产品";
    productBrand.textContent = product?.brandName || "请先选择具体产品";
    productCategory.textContent = product?.category || "产品事实将从当前 Product Graph 读取";
    openPicker.textContent = product ? "更换产品" : "选择产品";
  };

  const selectProduct = (id) => {
    if (!catalog.products?.[id]) return;
    productField.value = id;
    updateSnapshots();
    if (picker?.open) picker.close();
  };

  const renderPicker = (query = "") => {
    const needle = query.trim().toLocaleLowerCase();
    const matches = products.filter((product) => !needle || `${product.productName} ${product.brandName}`.toLocaleLowerCase().includes(needle)).slice(0, 30);
    pickerResults.replaceChildren(...matches.map((product) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "picker-option";
      button.dataset.productFamilyId = product.id;
      const title = document.createElement("strong");
      title.textContent = product.productName;
      const meta = document.createElement("span");
      meta.textContent = `${product.brandName} · ${product.category || "Physical AI"}`;
      button.append(title, meta);
      return button;
    }));
    pickerEmpty.hidden = matches.length > 0;
  };

  openPicker.addEventListener("click", () => {
    renderPicker(pickerSearch.value);
    picker.showModal();
    pickerSearch.focus();
  });
  closePicker.addEventListener("click", () => picker.close());
  picker.addEventListener("click", (event) => {
    if (event.target === picker) picker.close();
    const option = event.target.closest?.("[data-product-family-id]");
    if (option) selectProduct(option.dataset.productFamilyId);
  });
  pickerSearch.addEventListener("input", () => renderPicker(pickerSearch.value));

  const requestedProduct = params.get("productFamilyId") || params.get("product");
  if (catalog.products?.[requestedProduct]) productField.value = requestedProduct;
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
    if (!productField.value || !catalog.products?.[productField.value]) {
      status.className = "form-status error";
      status.textContent = "请先选择一个具体产品，再提交合作意向。";
      openPicker.focus();
      return;
    }
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
      const selectedProduct = productField.value;
      form.reset();
      productField.value = selectedProduct;
      updateSnapshots();
    } catch (error) {
      status.className = "form-status error";
      status.textContent = error.message || "提交失败，请稍后重试。";
    } finally {
      submit.disabled = false;
    }
  });
})();
