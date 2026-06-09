/* render.js — profile section renderers + utilities */

/* ── Utilities ───────────────────────────────────── */
function fmtXP(n) {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " MB";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " kB";
  return n + " B";
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function pathToName(p) {
  if (!p) return "Unknown";
  const parts = p.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || parts[parts.length - 2] || p;
}

/* SVG coordinate helper */
const ff = (n) => Number(n).toFixed(2);

/* ── SECTION 1 · User Identity ─────────────────── */
function renderHero(user) {
  document.getElementById("hero-login-text").textContent = user.login;
  document.getElementById("hero-id-text").textContent = "#" + user.id;
  document.getElementById("nav-login").textContent = user.login;

  const b = document.getElementById("hero-badges");
  const yr = new Date(user.createdAt).getFullYear();

  if (yr)
    b.insertAdjacentHTML(
      "beforeend",
      `<span class="badge badge-purple">Joined ${yr}</span>`,
    );

  if (user.firstName && user.lastName)
    b.insertAdjacentHTML(
      "beforeend",
      `<span class="badge badge-green">${user.firstName} ${user.lastName}</span>`,
    );

  if (user.campus)
    b.insertAdjacentHTML(
      "beforeend",
      `<span class="badge badge-pink">${user.campus}</span>`,
    );
}

/* ── SECTION 2 · XP & Progress ─────────────────── */
function renderXP(txs) {
  const total = txs.reduce((s, t) => s + t.amount, 0);
  document.getElementById("total-xp").textContent = fmtXP(total);

  const maxAmt = txs.length ? Math.max(...txs.map((t) => t.amount)) : 0;

  const rows = [
    { label: "XP transactions", value: txs.length },
    {
      label: "Avg XP / project",
      value: txs.length ? fmtXP(Math.round(total / txs.length)) : "0",
    },
    { label: "Largest single XP", value: fmtXP(maxAmt) },
    {
      label: "First earned",
      value: txs.length ? fmtDate(txs[0].createdAt) : "—",
    },
  ];

  document.getElementById("xp-stats-rows").innerHTML = rows
    .map(
      (r) => `<div class="stat-row">
      <span class="stat-label">${r.label}</span>
      <span class="stat-value">${r.value}</span>
    </div>`,
    )
    .join("");
}

/* ── SECTION 3 · Audit Ratio ────────────────────── */
function renderAudit(ad, user) {
  const done = user.totalUp || ad.upTotal.aggregate.sum.amount || 0;
  const recv = user.totalDown || ad.downTotal.aggregate.sum.amount || 0;
  const ratio = recv > 0 ? (done / recv).toFixed(2) : "∞";

  document.getElementById("audit-ratio-num").textContent = ratio;
  document.getElementById("lbl-done").textContent = `Done: ${fmtXP(done)}`;
  document.getElementById("lbl-recv").textContent = `Received: ${fmtXP(recv)}`;

  const pct = recv > 0 ? Math.min(100, (done / recv) * 50) : 0;
  setTimeout(() => {
    document.getElementById("ratio-fill").style.width = pct + "%";
  }, 200);

  const r = parseFloat(ratio);
  const sc =
    r >= 1 ? "var(--success)" : r >= 0.8 ? "var(--warn)" : "var(--danger)";
  const sl =
    r >= 1
      ? "✓ Good standing"
      : r >= 0.8
        ? "⚠ Needs improvement"
        : "✗ Critical";

  document.getElementById("audit-stats-rows").innerHTML = `
    <div class="stat-row">
      <span class="stat-label">Audits done (up)</span>
      <span class="stat-value" style="color:var(--accent)">${fmtXP(done)}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Audits received (down)</span>
      <span class="stat-value" style="color:var(--accent2)">${fmtXP(recv)}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Status</span>
      <span class="stat-value" style="color:${sc}">${sl}</span>
    </div>`;
}

/* ── SECTION 4 · Top Skills ──────────────────────
   Fully dynamic — shows whatever skills THIS
   student has earned. Zero hardcoded names.      */
function renderSkills(txs) {
  /* Deduplicate: keep highest amount per skill type */
  const map = {};
  txs.forEach((t) => {
    const name = t.type.replace("skill_", "").replace(/_/g, " ");
    if (!map[name] || t.amount > map[name]) map[name] = t.amount;
  });

  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const max = sorted.length ? sorted[0][1] : 100;
  const el = document.getElementById("skills-list");

  if (!sorted.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12px">No skill data yet.</div>`;
    return;
  }

  el.innerHTML = sorted
    .map(([name, amt]) => {
      const pct = Math.round((amt / max) * 100);
      return `<div class="skill-item">
        <span class="skill-name">${name}</span>
        <div class="skill-bar-wrap">
          <div class="skill-bar" data-w="${pct}" style="width:0%"></div>
        </div>
        <span class="skill-pct">${amt}%</span>
      </div>`;
    })
    .join("");

  setTimeout(() => {
    el.querySelectorAll(".skill-bar").forEach((b) => {
      b.style.width = b.dataset.w + "%";
    });
  }, 200);
}

/* ── Recent XP Transactions ──────────────────── */
function renderRecentTx(txs) {
  const recent = [...txs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  document.getElementById("tx-list").innerHTML = recent
    .map(
      (t) => `<div class="tx-item">
        <div class="tx-dot"></div>
        <div class="tx-name" title="${t.path}">${pathToName(t.path)}</div>
        <div class="tx-xp">+${fmtXP(t.amount)}</div>
        <div class="tx-date">${fmtDate(t.createdAt)}</div>
      </div>`,
    )
    .join("");
}
