(() => {
  const form = document.getElementById("scrape-form");
  const urlsEl = document.getElementById("urls");
  const discoverEl = document.getElementById("discover");
  const maxDiscoverEl = document.getElementById("max-discover");
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
  const statusSubtitle = document.getElementById("status-subtitle");
  const resultsMeta = document.getElementById("results-meta");
  const resultsTable = document.getElementById("results-table");
  const statPills = document.getElementById("stat-pills");
  const statRecords = document.getElementById("stat-records");
  const statFailures = document.getElementById("stat-failures");
  const failuresBox = document.getElementById("failures-box");
  const failuresList = document.getElementById("failures-list");
  const historyList = document.getElementById("history-list");

  let pollTimer = null;
  let activeJobId = null;

  const CORE_FIELDS = ["brand", "product_title", "sku", "color", "size", "price", "currency", "specifications", "availability", "source_url"];

  document.getElementById("select-all-fields").addEventListener("click", () => {
    document.querySelectorAll('#field-grid input[type="checkbox"]').forEach((el) => {
      el.checked = true;
    });
  });

  document.getElementById("select-core-fields").addEventListener("click", () => {
    document.querySelectorAll('#field-grid input[type="checkbox"]').forEach((el) => {
      el.checked = CORE_FIELDS.includes(el.value) || el.dataset.required === "1";
    });
  });

  // Keep SKU always selected
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
      alert("Paste a homepage or collection URL first.");
      return;
    }
    btnDiscover.disabled = true;
    btnDiscover.textContent = "Discovering…";
    try {
      const data = await api("/api/discover", {
        method: "POST",
        body: JSON.stringify({
          url: urls[0],
          max_products: Number(maxDiscoverEl.value || 20),
        }),
      });
      discoverPreview.hidden = false;
      if (!data.products.length) {
        discoverPreview.innerHTML = `<strong>No product links found</strong> on that page.`;
      } else {
        discoverPreview.innerHTML = `
          <strong>Found ${data.count} product page(s)</strong>
          <ol>${data.products.map((u) => `<li><a href="${u}" target="_blank" rel="noopener">${u}</a></li>`).join("")}</ol>
          <p style="margin:0.6rem 0 0;color:var(--ink-muted)">Enable “auto-find product pages” and start scrape to use these.</p>`;
        // Optionally fill textarea with discovered URLs when discover toggle is on
        if (discoverEl.checked) {
          urlsEl.value = data.products.join("\n");
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      btnDiscover.disabled = false;
      btnDiscover.textContent = "Preview discovered products";
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
    statusSubtitle.textContent = "Scraping in progress…";

    try {
      const job = await api("/api/scrape", {
        method: "POST",
        body: JSON.stringify({
          urls,
          fields,
          discover_from_homepage: discoverEl.checked,
          max_discover: Number(maxDiscoverEl.value || 20),
          use_browser: document.getElementById("use-browser").checked,
          interact_variants: document.getElementById("interact-variants").checked,
          respect_robots: document.getElementById("respect-robots").checked,
          delay: Number(document.getElementById("delay").value || 1),
          timeout: Number(document.getElementById("timeout").value || 30),
        }),
      });
      activeJobId = job.id;
      renderJob(job);
      startPolling(job.id);
      refreshHistory();
    } catch (err) {
      alert(err.message);
      btnScrape.disabled = false;
      btnScrape.querySelector(".btn-label").textContent = "Start scrape";
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
          btnScrape.querySelector(".btn-label").textContent = "Start scrape";
          refreshHistory();
        }
      } catch (_) {
        /* ignore transient errors */
      }
    }, 1200);
  }

  function renderJob(job) {
    const pct = Math.round((job.progress || 0) * 100);
    progressFill.style.width = `${pct}%`;
    progressPct.textContent = `${pct}%`;
    progressLabel.textContent = job.message || job.status;
    statusSubtitle.textContent = `Job ${job.id} · ${job.status}`;

    logList.innerHTML = (job.logs || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    logList.scrollTop = logList.scrollHeight;

    if (job.status === "completed") {
      jobActions.hidden = false;
      btnXlsx.href = `/api/jobs/${job.id}/download.xlsx`;
      btnCsv.href = `/api/jobs/${job.id}/download.csv`;
      renderResults(job);
    } else if (job.status === "failed") {
      resultsMeta.textContent = job.message || "Scrape failed.";
    }
  }

  function renderResults(job) {
    const fields = job.fields || [];
    const rows = job.preview || [];
    statPills.hidden = false;
    statRecords.textContent = String(job.record_count || 0);
    statFailures.textContent = String(job.failure_count || 0);
    resultsMeta.textContent = rows.length
      ? `Showing ${Math.min(rows.length, 50)} of ${job.record_count} SKU row(s).`
      : "No product rows returned.";

    const thead = resultsTable.querySelector("thead");
    const tbody = resultsTable.querySelector("tbody");
    thead.innerHTML = `<tr>${fields.map((f) => `<th>${escapeHtml(f)}</th>`).join("")}</tr>`;
    tbody.innerHTML = rows
      .map((row) => `<tr>${fields.map((f) => `<td title="${escapeAttr(row[f] || "")}">${escapeHtml(String(row[f] ?? ""))}</td>`).join("")}</tr>`)
      .join("");

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
          activeJobId = job.id;
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
})();
