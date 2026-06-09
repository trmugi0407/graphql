/* test-panel.js — Visual In-Page Query Test Panel
   Bonus: own GraphiQL-style interface
   Click "🧪 Test Queries" button in the nav bar.
*/

document.addEventListener("DOMContentLoaded", () => {
  /* ── Inject CSS ── */
  const s = document.createElement("style");
  s.textContent = `
    #test-toggle {
      padding:6px 14px; background:transparent;
      border:1px solid var(--accent3); color:var(--accent3);
      border-radius:var(--r); font-size:12px;
      font-family:var(--font-mono); cursor:pointer; transition:all .2s;
    }
    #test-toggle:hover { background:rgba(123,97,255,.12); }

    #test-panel {
      position:fixed; bottom:0; left:0; right:0; z-index:300;
      background:rgba(11,21,32,.97); border-top:2px solid var(--accent3);
      backdrop-filter:blur(12px);
      transform:translateY(100%);
      transition:transform .35s cubic-bezier(.22,1,.36,1);
      max-height:65vh; display:flex; flex-direction:column;
    }
    #test-panel.open { transform:translateY(0); }

    .tp-hdr {
      display:flex; align-items:center; gap:10px;
      padding:10px 18px; border-bottom:1px solid var(--border); flex-shrink:0;
    }
    .tp-title { font-family:var(--font-head); font-weight:800; color:var(--accent3); }
    .tp-sub   { color:var(--muted); font-size:11px; }
    .tp-close { margin-left:auto; background:transparent; border:none;
                color:var(--muted); font-size:18px; cursor:pointer; }
    .tp-close:hover { color:var(--danger); }

    .tp-btns {
      display:flex; gap:8px; padding:10px 18px; flex-wrap:wrap;
      flex-shrink:0; border-bottom:1px solid var(--border);
    }
    .tp-btn {
      padding:5px 13px; border-radius:6px; font-size:11px;
      font-family:var(--font-mono); font-weight:700; text-transform:uppercase;
      letter-spacing:.5px; cursor:pointer; border:1px solid; transition:all .2s;
    }
    .tp-normal  { border-color:#00e5ff; color:#00e5ff; background:rgba(0,229,255,.08); }
    .tp-arg     { border-color:#ffb800; color:#ffb800; background:rgba(255,184,0,.08); }
    .tp-nested  { border-color:#7b61ff; color:#7b61ff; background:rgba(123,97,255,.08); }
    .tp-all     { border-color:#00ff9d; color:#00ff9d; background:rgba(0,255,157,.08); }
    .tp-clr     { border-color:#4a7090; color:#4a7090; background:transparent; }
    .tp-btn:hover     { opacity:.75; transform:translateY(-1px); }
    .tp-btn:disabled  { opacity:.35; cursor:not-allowed; transform:none; }

    .tp-body { overflow-y:auto; padding:14px 18px; flex:1;
               font-family:var(--font-mono); font-size:12px; }

    .tp-card {
      margin-bottom:14px; padding:12px 14px;
      background:var(--surface); border-radius:8px;
      border-left:3px solid var(--muted);
      animation:fadeUp .25s ease;
    }
    .tp-card.normal  { border-color:#00e5ff; }
    .tp-card.arg     { border-color:#ffb800; }
    .tp-card.nested  { border-color:#7b61ff; }
    .tp-card.ok      { border-color:#00ff9d; }
    .tp-card.err     { border-color:#ff3c5c; }

    .tp-tag {
      display:inline-block; padding:2px 8px; border-radius:4px;
      font-size:10px; font-weight:700; text-transform:uppercase;
      letter-spacing:.5px; margin-bottom:6px;
    }
    .tag-normal  { background:rgba(0,229,255,.15); color:#00e5ff; }
    .tag-arg     { background:rgba(255,184,0,.15);  color:#ffb800; }
    .tag-nested  { background:rgba(123,97,255,.15); color:#7b61ff; }
    .tag-ok      { background:rgba(0,255,157,.15);  color:#00ff9d; }
    .tag-err     { background:rgba(255,60,92,.15);  color:#ff3c5c; }

    .tp-qbox {
      background:var(--card); border-radius:5px; padding:7px 10px; margin:6px 0;
      font-size:11px; color:var(--muted); white-space:pre-wrap; word-break:break-word;
      max-height:100px; overflow-y:auto;
    }
    .tp-result { margin-top:6px; color:var(--text); line-height:1.7; }
    .tp-empty  { color:var(--muted); text-align:center; padding:20px 0; }
    .tp-row    { padding:3px 0; border-bottom:1px solid var(--border); }
  `;
  document.head.appendChild(s);

  /* ── Panel HTML ── */
  const panel = document.createElement("div");
  panel.id = "test-panel";
  panel.innerHTML = `
    <div class="tp-hdr">
      <span style="font-size:16px">🧪</span>
      <span class="tp-title">GraphQL Query Tester</span>
      <span class="tp-sub">Live tests against the API — own GraphiQL panel</span>
      <button class="tp-close" onclick="togglePanel()">✕</button>
    </div>
    <div class="tp-btns">
      <button class="tp-btn tp-normal" onclick="pTest('normal')">① Normal</button>
      <button class="tp-btn tp-arg"    onclick="pTest('arg')">② Argument</button>
      <button class="tp-btn tp-nested" onclick="pTest('nested')">③ Nested</button>
      <button class="tp-btn tp-all"    onclick="pTest('all')">▶ Run All 3</button>
      <button class="tp-btn tp-clr"    onclick="pClear()">✕ Clear</button>
    </div>
    <div class="tp-body" id="tp-body">
      <div class="tp-empty">Click a button to run a live query.</div>
    </div>`;
  document.body.appendChild(panel);

  /* ── Add toggle button to nav ── */
  const navRight = document.querySelector(".nav-right");
  if (navRight) {
    const btn = document.createElement("button");
    btn.id = "test-toggle";
    btn.textContent = "🧪 Test Queries";
    btn.onclick = togglePanel;
    navRight.insertBefore(btn, navRight.firstChild);
  }
});

function togglePanel() {
  document.getElementById("test-panel")?.classList.toggle("open");
}
function pClear() {
  const b = document.getElementById("tp-body");
  if (b)
    b.innerHTML = `<div class="tp-empty">Click a button to run a live query.</div>`;
}

function pLog(type, title, queryTxt, html) {
  const b = document.getElementById("tp-body");
  if (!b) return;
  b.querySelector(".tp-empty")?.remove();
  const d = document.createElement("div");
  d.className = `tp-card ${type}`;
  d.innerHTML = `
    <span class="tp-tag tag-${type}">${type}</span>
    <strong style="color:#c8dde8;margin-left:8px">${title}</strong>
    <div class="tp-qbox">${queryTxt}</div>
    <div class="tp-result">${html}</div>`;
  b.prepend(d);
}

async function pTest(type) {
  if (!STATE.jwt) {
    pLog(
      "err",
      "Not logged in",
      "—",
      "<span style='color:var(--danger)'>❌ Please log in first.</span>",
    );
    return;
  }
  if (type === "all") {
    await pTest("normal");
    await pTest("arg");
    await pTest("nested");
    return;
  }
  document.querySelectorAll(".tp-btn").forEach((b) => (b.disabled = true));
  try {
    if (type === "normal") {
      const q = `{ user { id login firstName lastName createdAt campus } }`;
      const d = await gql(q);
      const u = d.user[0];
      pLog(
        "normal",
        "① Normal Query",
        q,
        `
        <span style="color:var(--success)">✅ PASSED</span><br>
        <b>Login:</b> @${u.login} &nbsp; <b>ID:</b> ${u.id}<br>
        <b>Name:</b> ${u.firstName || ""} ${u.lastName || ""} &nbsp;
        <b>Campus:</b> ${u.campus || "—"} &nbsp;
        <b>Joined:</b> ${new Date(u.createdAt).getFullYear()}`,
      );
    } else if (type === "arg") {
      const q = QUERY_XP;
      const v = { userId: STATE.userId };
      const d = await gql(q, v);
      const txs = d.transaction || [];
      const tot = txs.reduce((s, t) => s + t.amount, 0);
      const rows = txs
        .slice(0, 5)
        .map(
          (t) =>
            `<div class="tp-row">${pathToName(t.path)} — <b style="color:var(--success)">+${fmtXP(t.amount)}</b></div>`,
        )
        .join("");
      pLog(
        "arg",
        "② Argument Query",
        q,
        `
        <span style="color:var(--success)">✅ PASSED</span>
        · ${txs.length} transactions · ${fmtXP(tot)} XP<br>
        <div style="margin-top:6px">${rows}</div>`,
      );
    } else if (type === "nested") {
      const q = QUERY_RESULTS;
      const v = { userId: STATE.userId };
      const d = await gql(q, v);
      const rs = d.result || [];
      const ok = rs.filter((r) => r.grade >= 1).length;
      const fl = rs.filter((r) => r.grade < 1).length;
      const rows = rs
        .slice(0, 5)
        .map((r) => {
          const g =
            r.grade >= 1
              ? `<span style="color:var(--success)">✅ PASS</span>`
              : `<span style="color:var(--danger)">❌ FAIL</span>`;
          return `<div class="tp-row">
          ${pathToName(r.path)} · ${g} ·
          <span style="color:var(--accent3)">${r.object?.name || "—"}</span>
          <span style="color:var(--muted)">(${r.object?.type || "—"})</span>
        </div>`;
        })
        .join("");
      pLog(
        "nested",
        "③ Nested Query (object{} inside result)",
        q,
        `
        <span style="color:var(--success)">✅ PASSED</span>
        · ${rs.length} unique paths · ${ok} pass · ${fl} fail<br>
        <span style="color:var(--muted);font-size:10px">
          <b>object{}</b> is nested inside result
        </span>
        <div style="margin-top:6px">${rows}</div>`,
      );
    }
  } catch (e) {
    pLog(
      "err",
      `${type} — Error`,
      "—",
      `<span style="color:var(--danger)">❌ ${e.message}</span>`,
    );
  } finally {
    document.querySelectorAll(".tp-btn").forEach((b) => (b.disabled = false));
  }
}

window.togglePanel = togglePanel;
window.pClear = pClear;
window.pTest = pTest;
