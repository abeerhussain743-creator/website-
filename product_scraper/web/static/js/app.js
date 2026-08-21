(() => {
  const form = document.getElementById("scrape-form");
  const urlsEl = document.getElementById("urls");
  const discoverEl = document.getElementById("discover");
  const deepCrawlEl = document.getElementById("deep-crawl");
  const maxDiscoverEl = document.getElementById("max-discover");
  const workersEl = document.getElementById("workers");
  const btnDiscover = document.getElementById("btn-discover");
  const discoverPreview = document.getElementById("discover-preview");
  const btnScrape = document.getElementById("btn-scrape");
  const progressBlock = document.getElementById("progress-block");
  const emptyStatus = document.getElementById("empty-status");
  const progressFill = document.getElementById("progress-fill");
  const progressLabel = document.getElementById("progress-label");
  const progressPct = document.getElementById("progress-pct");
  const logList = document.getElementById("log-list");
  const jobActions = document.getElementById("job-actions");
  const btnXlsx = document.getElementById("btn-xlsx");
  const btnCsv = document.getElementById("btn-csv");
  const btnJson = document.getElementById("btn-json");
  const btnImages = document.getElementById("btn-images");
  const statusSubtitle = document.getElementById("status-subtitle");
  const resultsMeta = document.getElementById("results-meta");
  const resultsTable = document.getElementById("results-table");
  const statPills = document.getElementById("stat-pills");
  const statRecords = document.getElementById("stat-records");
  const statFailures = document.getElementById("stat-failures");
  const failuresBox = document.getElementById("failures-box");
  const failuresList = document.getElementById("failures-list");
  const historyList = document.getElementById("history-list");
  const summaryCards = document.getElementById("summary-cards");
  const tableFilter = document.getElementById("table-filter");

  const PRESETS = window.VARIANTXL_PRESETS || {};
  let pollTimer = null;
  let latestRows = [];
  let latestFields = [];

  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.preset;
      const fields = PRESETS[key] || [];
      document.querySelectorAll('#field-grid input[type="checkbox"]').forEach((el) => {
        el.checked = fields.includes(el.value) || el.dataset.required === "1";
      });
    });
  });

  document.querySelectorAll('#field-grid input[data-required="1"]').forEach((el) => {
    el.addEventListener("change", () => {
      el.checked = true;
    });
  });

  function selectedFields() {
    return Array.from(document.querySelectorAll('#field-grid input[type="checkbox"]:checked')).map((el) => el.value);
  }

  function parseUrls() {
    return urlsEl.value
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.message || `Request failed (${res.status})`);
    }
    return data;
  }

  btnDiscover.addEventListener("click", async () => {
    const urls = parseUrls();
    if (!urls.length) {
      alert("Paste a store or collection URL first.");
      return;
    }
    btnDiscover.disabled = true;
    btnDiscover.textContent = "Discovering…";
    try {
      const data = await api("/api/discover", {
        method: "POST",
        body: JSON.stringify({
          url: urls[0],
          max_products: Number(maxDiscoverEl.value || 500),
          deep: true,
          use_sitemap: document.getElementById("use-sitemap").checked,
          use_collections: document.getElementById("use-collections").checked,
        }),
      });
      discoverPreview.hidden = false;
      if (!data.products.length) {
        discoverPreview.innerHTML = `<strong>No product links found</strong>`;
      } else {
        const src = data.sources || {};
        discoverPreview.innerHTML = `
          <strong>Found ${data.count} product page(s)</strong>
          <div style="margin-top:0.35rem;color:var(--ink-muted)">
            Sources — HTML: ${src.html || 0}, Collections: ${src.collections_json || 0}, Sitemap: ${src.sitemap || 0}
            · Collections crawled: ${(data.collections || []).length}
          </div>
          <ol>${data.products.slice(0, 30).map((u) => `<li><a href="${u}" target="_blank" rel="noopener">${u}</a></li>`).join("")}</ol>
          ${data.count > 30 ? `<p style="color:var(--ink-muted)">…and ${data.count - 30} more</p>` : ""}`;
        if (discoverEl.checked || deepCrawlEl.checked) {
          urlsEl.value = data.products.join("\n");
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      btnDiscover.disabled = false;
      btnDiscover.textContent = "Preview deep discovery";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const urls = parseUrls();
    if (!urls.length) {
      alert("Add at least one URL.");
      return;
    }
    const fields = selectedFields();
    if (!fields.includes("sku")) fields.unshift("sku");

    btnScrape.disabled = true;
    btnScrape.querySelector(".btn-label").textContent = "Starting…";
    jobActions.hidden = true;
    emptyStatus.hidden = true;
    progressBlock.hidden = false;
    summaryCards.hidden = true;
    statusSubtitle.textContent = "Power scrape in progress…";

    try {
      const job = await api("/api/scrape", {
        method: "POST",
        body: JSON.stringify({
          urls,
          fields,
          discover_from_homepage: discoverEl.checked,
          deep_crawl: deepCrawlEl.checked || discoverEl.checked,
          max_discover: Number(maxDiscoverEl.value || 500),
          use_sitemap: document.getElementById("use-sitemap").checked,
          use_collections: document.getElementById("use-collections").checked,
          workers: Number(workersEl.value || 2),
          use_browser: document.getElementById("use-browser").checked,
          interact_variants: document.getElementById("interact-variants").checked,
          respect_robots: document.getElementById("respect-robots").checked,
          delay: Number(document.getElementById("delay").value || 1),
          timeout: Number(document.getElementById("timeout").value || 30),
          min_price: document.getElementById("min-price").value || null,
          max_price: document.getElementById("max-price").value || null,
          in_stock_only: document.getElementById("in-stock-only").checked,
          brand_contains: document.getElementById("brand-contains").value || "",
          query: document.getElementById("query").value || "",
          download_images: document.getElementById("download-images").checked,
          max_images: 3,
        }),
      });
      renderJob(job);
      startPolling(job.id);
      refreshHistory();
    } catch (err) {
      alert(err.message);
      btnScrape.disabled = false;
      btnScrape.querySelector(".btn-label").textContent = "Start powerful scrape";
    }
  });

  function startPolling(jobId) {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      try {
        const job = await api(`/api/jobs/${jobId}`);
        renderJob(job);
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(pollTimer);
          pollTimer = null;
          btnScrape.disabled = false;
          btnScrape.querySelector(".btn-label").textContent = "Start powerful scrape";
          refreshHistory();
        }
      } catch (_) {}
    }, 1000);
  }

  function renderSummary(summary) {
    if (!summary || !summary.record_count) {
      summaryCards.hidden = true;
      return;
    }
    summaryCards.hidden = false;
    const price =
      summary.price_min != null
        ? `$${summary.price_min}–$${summary.price_max}`
        : "—";
    summaryCards.innerHTML = `
      <div class="summary-card"><strong>${summary.record_count}</strong><span>SKU rows</span></div>
      <div class="summary-card"><strong>${summary.brand_count}</strong><span>Brands</span></div>
      <div class="summary-card"><strong>${summary.with_specs}</strong><span>With specs</span></div>
      <div class="summary-card"><strong>${summary.with_images}</strong><span>With images</span></div>
      <div class="summary-card"><strong>${escapeHtml(price)}</strong><span>Price range</span></div>
    `;
  }

  function renderJob(job) {
    const pct = Math.round((job.progress || 0) * 100);
    progressFill.style.width = `${pct}%`;
    progressPct.textContent = `${pct}%`;
    progressLabel.textContent = job.message || job.status;
    statusSubtitle.textContent = `Job ${job.id} · ${job.status}` +
      (job.discovered_count ? ` · discovered ${job.discovered_count}` : "");

    logList.innerHTML = (job.logs || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    logList.scrollTop = logList.scrollHeight;
    renderSummary(job.summary);

    if (job.status === "completed") {
      jobActions.hidden = false;
      btnXlsx.href = `/api/jobs/${job.id}/download.xlsx`;
      btnCsv.href = `/api/jobs/${job.id}/download.csv`;
      btnJson.href = `/api/jobs/${job.id}/download.json`;
      if (job.images_zip) {
        btnImages.hidden = false;
        btnImages.href = `/api/jobs/${job.id}/download.images.zip`;
      } else {
        btnImages.hidden = true;
      }
      renderResults(job);
    } else if (job.status === "failed") {
      resultsMeta.textContent = job.message || "Scrape failed.";
    }
  }

  function renderResults(job) {
    latestFields = job.fields || [];
    latestRows = job.preview || [];
    statPills.hidden = false;
    statRecords.textContent = String(job.record_count || 0);
    statFailures.textContent = String(job.failure_count || 0);
    resultsMeta.textContent = latestRows.length
      ? `Showing ${Math.min(latestRows.length, 100)} of ${job.record_count} SKU row(s).`
      : "No product rows returned.";
    paintTable(latestFields, latestRows);

    if (job.failures && job.failures.length) {
      failuresBox.hidden = false;
      failuresList.innerHTML = job.failures
        .map((f) => `<li><strong>${escapeHtml(f.url)}</strong> — ${escapeHtml(f.reason)}</li>`)
        .join("");
    } else {
      failuresBox.hidden = true;
      failuresList.innerHTML = "";
    }
  }

  function paintTable(fields, rows) {
    const q = (tableFilter.value || "").trim().toLowerCase();
    const filtered = q
      ? rows.filter((row) => fields.some((f) => String(row[f] ?? "").toLowerCase().includes(q)))
      : rows;
    const thead = resultsTable.querySelector("thead");
    const tbody = resultsTable.querySelector("tbody");
    thead.innerHTML = `<tr>${fields.map((f) => `<th>${escapeHtml(f)}</th>`).join("")}</tr>`;
    tbody.innerHTML = filtered
      .map((row) => `<tr>${fields.map((f) => `<td title="${escapeAttr(row[f] || "")}">${escapeHtml(String(row[f] ?? ""))}</td>`).join("")}</tr>`)
      .join("");
  }

  tableFilter.addEventListener("input", () => paintTable(latestFields, latestRows));

  async function refreshHistory() {
    try {
      const data = await api("/api/jobs");
      const jobs = data.jobs || [];
      if (!jobs.length) {
        historyList.innerHTML = `<p class="history-meta">No jobs yet.</p>`;
        return;
      }
      historyList.innerHTML = jobs
        .map((j) => {
          const when = (j.created_at || "").replace("T", " ").slice(0, 19);
          return `<article class="history-item">
            <div>
              <span class="badge ${j.status}">${j.status}</span>
              <strong>${j.record_count || 0} SKUs</strong>
              <div class="history-meta">${escapeHtml(when)} · ${j.urls.length} URL(s) · ${escapeHtml(j.id)}</div>
            </div>
            <button type="button" data-job="${j.id}">Open</button>
          </article>`;
        })
        .join("");

      historyList.querySelectorAll("button[data-job]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const job = await api(`/api/jobs/${btn.dataset.job}`);
          emptyStatus.hidden = true;
          progressBlock.hidden = false;
          renderJob(job);
          if (job.status === "completed") renderResults(job);
          if (job.status === "running" || job.status === "queued") startPolling(job.id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    } catch (_) {
      historyList.innerHTML = `<p class="history-meta">Could not load history.</p>`;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("\n", " ");
  }

  refreshHistory();

  // --- Competitor watch ---
  const competitorForm = document.getElementById("competitor-form");
  const competitorList = document.getElementById("competitor-list");
  const alertsList = document.getElementById("alerts-list");
  const alertsMeta = document.getElementById("alerts-meta");
  const alertCount = document.getElementById("alert-count");
  const alertBell = document.getElementById("alert-bell");
  const watchStatus = document.getElementById("watch-status");
  const btnCheckAll = document.getElementById("btn-check-all");
  const btnApprove = document.getElementById("btn-approve-alerts");
  const btnDismiss = document.getElementById("btn-dismiss-alerts");
  const btnSelectAlerts = document.getElementById("btn-select-alerts");
  let watchPoll = null;

  alertBell.addEventListener("click", () => {
    document.getElementById("competitors").scrollIntoView({ behavior: "smooth" });
  });

  async function refreshCompetitors() {
    try {
      const data = await api("/api/competitors");
      const comps = data.competitors || [];
      updateAlertBadge(data.pending_alerts || 0);
      if (!comps.length) {
        competitorList.innerHTML = `<p class="history-meta">No competitors yet. Add 5–6 store URLs above.</p>`;
      } else {
        competitorList.innerHTML = comps
          .map((c) => {
            const checked = c.last_checked_at
              ? String(c.last_checked_at).replace("T", " ").slice(0, 19)
              : "never";
            return `<article class="competitor-item">
              <div>
                <strong>${escapeHtml(c.name)}</strong>
                <div class="meta">${escapeHtml(c.seed_url)}</div>
                <div class="meta">Known products: ${c.known_products || 0} · Pending: ${c.pending_alerts || 0} · Last check: ${escapeHtml(checked)}</div>
              </div>
              <div class="actions">
                <button type="button" class="btn ghost" data-check="${c.id}">Check</button>
                <button type="button" class="btn ghost" data-del="${c.id}">Remove</button>
              </div>
            </article>`;
          })
          .join("");

        competitorList.querySelectorAll("[data-check]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "Checking…";
            try {
              const res = await api(`/api/competitors/${btn.dataset.check}/check`, { method: "POST", body: "{}" });
              showWatchStatus(res.message || `Found ${res.new_count} new product(s)`);
              await refreshCompetitors();
              await refreshAlerts();
            } catch (err) {
              alert(err.message);
            } finally {
              btn.disabled = false;
              btn.textContent = "Check";
            }
          });
        });
        competitorList.querySelectorAll("[data-del]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (!confirm("Remove this competitor?")) return;
            await api(`/api/competitors/${btn.dataset.del}`, { method: "DELETE" });
            await refreshCompetitors();
            await refreshAlerts();
          });
        });
      }
    } catch (err) {
      competitorList.innerHTML = `<p class="history-meta">${escapeHtml(err.message)}</p>`;
    }
  }

  async function refreshAlerts() {
    try {
      const data = await api("/api/alerts?status=pending");
      const alerts = data.alerts || [];
      updateAlertBadge(data.pending_count || 0);
      if (!alerts.length) {
        alertsMeta.textContent = "No pending alerts. Run “Check all for updates”.";
        alertsList.innerHTML = "";
        return;
      }
      alertsMeta.textContent = `${alerts.length} new product(s) highlighted — select and approve to scrape.`;
      alertsList.innerHTML = alerts
        .map(
          (a) => `<label class="alert-item new">
            <input type="checkbox" name="alert" value="${escapeAttr(a.id)}" checked />
            <div>
              <span class="tag">New</span>
              <strong>${escapeHtml(a.competitor_name || "Competitor")}</strong>
              <div style="margin-top:0.25rem;color:var(--ink-muted);font-size:0.84rem">${escapeHtml(a.message)}</div>
              <a href="${escapeAttr(a.product_url)}" target="_blank" rel="noopener">${escapeHtml(a.product_url)}</a>
            </div>
            <div class="meta">${escapeHtml(String(a.created_at || "").replace("T", " ").slice(0, 19))}</div>
          </label>`
        )
        .join("");
    } catch (err) {
      alertsMeta.textContent = err.message;
    }
  }

  function updateAlertBadge(n) {
    alertCount.textContent = String(n || 0);
    alertBell.classList.toggle("has-alerts", Number(n) > 0);
  }

  function showWatchStatus(msg) {
    watchStatus.hidden = false;
    watchStatus.textContent = msg;
  }

  function selectedAlertIds() {
    return Array.from(document.querySelectorAll('#alerts-list input[name="alert"]:checked')).map((el) => el.value);
  }

  competitorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const seed_url = document.getElementById("comp-url").value.trim();
    if (!seed_url) return;
    try {
      await api("/api/competitors", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("comp-name").value.trim(),
          seed_url,
          max_discover: Number(document.getElementById("comp-max").value || 200),
        }),
      });
      document.getElementById("comp-name").value = "";
      document.getElementById("comp-url").value = "";
      await refreshCompetitors();
    } catch (err) {
      alert(err.message);
    }
  });

  btnCheckAll.addEventListener("click", async () => {
    btnCheckAll.disabled = true;
    btnCheckAll.textContent = "Checking…";
    showWatchStatus("Checking all competitors for new products…");
    try {
      const start = await api("/api/competitors/check-all", { method: "POST", body: "{}" });
      if (watchPoll) clearInterval(watchPoll);
      watchPoll = setInterval(async () => {
        try {
          const st = await api(`/api/competitors/check-status/${start.token}`);
          showWatchStatus(st.message || st.status);
          if (st.status === "completed" || st.status === "failed") {
            clearInterval(watchPoll);
            watchPoll = null;
            btnCheckAll.disabled = false;
            btnCheckAll.textContent = "Check all for updates";
            await refreshCompetitors();
            await refreshAlerts();
          }
        } catch (_) {}
      }, 1500);
    } catch (err) {
      alert(err.message);
      btnCheckAll.disabled = false;
      btnCheckAll.textContent = "Check all for updates";
    }
  });

  btnSelectAlerts.addEventListener("click", () => {
    const boxes = document.querySelectorAll('#alerts-list input[name="alert"]');
    const allOn = Array.from(boxes).every((b) => b.checked);
    boxes.forEach((b) => {
      b.checked = !allOn;
    });
  });

  btnDismiss.addEventListener("click", async () => {
    const ids = selectedAlertIds();
    if (!ids.length) {
      alert("Select alerts to dismiss.");
      return;
    }
    await api("/api/alerts/dismiss", { method: "POST", body: JSON.stringify({ alert_ids: ids }) });
    await refreshAlerts();
    await refreshCompetitors();
  });

  btnApprove.addEventListener("click", async () => {
    const ids = selectedAlertIds();
    if (!ids.length) {
      alert("Select new products to approve for scraping.");
      return;
    }
    if (!confirm(`Approve and scrape ${ids.length} product(s)?`)) return;
    btnApprove.disabled = true;
    try {
      const res = await api("/api/alerts/approve", {
        method: "POST",
        body: JSON.stringify({
          alert_ids: ids,
          fields: selectedFields(),
          workers: Number(workersEl.value || 3),
          use_browser: document.getElementById("use-browser").checked,
          interact_variants: false,
          respect_robots: document.getElementById("respect-robots").checked,
          delay: Number(document.getElementById("delay").value || 0.8),
        }),
      });
      showWatchStatus(res.message || "Scrape approved and started");
      await refreshAlerts();
      await refreshCompetitors();
      if (res.job && res.job.id) {
        emptyStatus.hidden = true;
        progressBlock.hidden = false;
        renderJob(res.job);
        startPolling(res.job.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      btnApprove.disabled = false;
    }
  });

  refreshCompetitors();
  refreshAlerts();
})();
