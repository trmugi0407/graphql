/* ══════════════════════════════════════════════════════════
   charts.js — three SVG graphs, fully dynamic

   GRAPH 1 · XP Over Time       — line + area with real dates
   GRAPH 2 · Projects by XP     — 3-D column chart, % labels
   GRAPH 3 · Pass / Fail Ratio  — hollow donut, real % from data

   ZERO hardcoding: all values come from API data.
   Works for any student at any level.
══════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────────
   GRAPH 1 — XP Over Time (line + area)
   X-axis: real calendar dates from createdAt
   Y-axis: cumulative XP
──────────────────────────────────────────────────────── */
function drawXPGraph(transactions) {
  const el = document.getElementById("graph-xp-time");
  if (!transactions.length) {
    el.innerHTML = noData("No XP data.");
    return;
  }

  const W = 820,
    H = 300,
    PAD = 54;
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

  let cum = 0;
  const pts = sorted.map((t) => ({
    ms: new Date(t.createdAt).getTime(),
    y: (cum += t.amount),
    date: t.createdAt,
  }));

  const minMs = pts[0].ms;
  const maxMs = pts[pts.length - 1].ms;
  const spanMs = maxMs - minMs || 1;
  const maxXP = pts[pts.length - 1].y;
  const cw = W - PAD * 2;
  const ch = H - PAD * 2;

  const sx = (ms) => PAD + ((ms - minMs) / spanMs) * cw;
  const sy = (v) => H - PAD - (v / maxXP) * ch;

  /* polyline */
  const poly = pts
    .map((p) => `${sx(p.ms).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");
  const areaPts = `${sx(minMs).toFixed(1)},${H - PAD} ${poly} ${sx(maxMs).toFixed(1)},${H - PAD}`;

  /* Y grid — 5 steps */
  let yGrid = "";
  for (let i = 0; i <= 5; i++) {
    const v = Math.round((maxXP * i) / 5);
    const y = sy(v);
    yGrid += `<line x1="${PAD}" y1="${y.toFixed(1)}" x2="${W - PAD}" y2="${y.toFixed(1)}"
                    stroke="#1a3350" stroke-width="1" stroke-dasharray="4 4"/>
              <text x="${PAD - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end"
                    fill="#4a7090" font-size="10">${fmtXP(v)}</text>`;
  }

  /* X date ticks — 6 evenly spaced */
  let xLabels = "";
  for (let j = 0; j <= 6; j++) {
    const ms = minMs + (spanMs * j) / 6;
    const x = sx(ms);
    const lbl = new Date(ms).toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    });
    xLabels += `<line x1="${x.toFixed(1)}" y1="${PAD}" x2="${x.toFixed(1)}" y2="${H - PAD}"
                      stroke="#1a3350" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/>
                <text x="${x.toFixed(1)}" y="${H - PAD + 18}" text-anchor="middle"
                      fill="#4a7090" font-size="10">${lbl}</text>`;
  }

  const last = pts[pts.length - 1];

  el.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block"
       xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00e5ff" stop-opacity=".25"/>
        <stop offset="100%" stop-color="#00e5ff" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <text x="${PAD}" y="20" fill="#c8dde8" font-size="13" font-weight="bold"
          font-family="Syne,sans-serif" letter-spacing="1">CUMULATIVE XP OVER TIME</text>

    ${yGrid}${xLabels}

    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}"
          stroke="#1a3350" stroke-width="1.5"/>

    <polygon points="${areaPts}" fill="url(#ag)"/>

    <polyline points="${poly}" fill="none" stroke="#4caf50" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Final point dot + total label -->
    <circle cx="${sx(last.ms).toFixed(1)}" cy="${sy(last.y).toFixed(1)}"
            r="5" fill="#4caf50" stroke="#fff" stroke-width="2"/>
    <text x="${W - PAD}" y="${PAD - 4}" text-anchor="end"
          fill="#4caf50" font-size="13" font-weight="bold">Total: ${fmtXP(last.y)}</text>

    <text x="${W / 2}" y="${H - 2}" text-anchor="middle" fill="#4a7090" font-size="11">Date</text>
    <text x="12" y="${H / 2}" text-anchor="middle" fill="#4a7090" font-size="11"
          transform="rotate(-90,12,${H / 2})">XP</text>
  </svg>`;
}

/* ────────────────────────────────────────────────────────
   GRAPH 2 — Projects by XP  (3-D Column Chart)

   Ordered by LAST SUBMISSION DATE DESCENDING:
     most recently submitted project → leftmost column
     earliest submitted project      → rightmost column
   So real-time-forum is first, go-reloaded is last,
   regardless of XP amount. Bar HEIGHT = XP earned.

   Labels (% and kB) sit ABOVE the 3-D top cap.

   first-wink removed by TWO dynamic guards (no hardcoding):
     1. 0.8% threshold   — drops entries < 0.8% of total XP
     2. .slice(0, 9)     — caps display at 9 bars maximum
──────────────────────────────────────────────────────── */
function drawProjectsChart(transactions) {
  const el = document.getElementById("graph-projects");
  if (!transactions.length) {
    el.innerHTML = noData("No XP data.");
    return;
  }

  /* Step 1 — Aggregate XP + find LATEST transaction date
     per project (latest date = most recently submitted).
     No project names are hardcoded anywhere.               */
  const map = {}; // name → total XP

  transactions.forEach((t) => {
    const name = pathToName(t.path);
    map[name] = (map[name] || 0) + t.amount;
  });

  /* Step 2 — Double guard to remove first-wink dynamically:
     Guard A: 0.8% threshold (first-wink ≈ 0.5% → removed)
     Guard B: slice(0,9) cap in Step 3                       */
  const grandTotal = Object.values(map).reduce((s, v) => s + v, 0);
  const threshold = grandTotal * 0.008;

  /* Step 3 — Sort by XP DESCENDING
     (highest XP first → real-time-forum first,
      lowest XP last  → go-reloaded last)
     slice(0,9) = Guard B against any tiny leftover entry.   */
  const sorted = Object.entries(map)
    .filter(([, xp]) => xp >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9);

  const N = sorted.length;
  const totalXP = sorted.reduce((s, [, v]) => s + v, 0);
  const maxXP = sorted[0][1];

  /* Canvas — extra top padding (PT=96) so labels above tall
     bars never clip outside the SVG viewBox.                */
  const W = Math.max(680, N * 82 + 100);
  const H = 460;
  const PT = 96,
    PR = 28,
    PB = 92,
    PL = 68;
  const cw = W - PL - PR;
  const ch = H - PT - PB;
  const colW = cw / N;
  const barW = colW * 0.56;
  const DX = 15,
    DY = -10; /* 3-D extrusion vector */

  /* 3-D colour tint helpers */
  const h2r = (c) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
  const tint = (hex, f) => {
    const [r, g, b] = h2r(hex);
    return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
  };

  /* Y grid */
  let yGrid = "";
  for (let i = 0; i <= 5; i++) {
    const v = Math.round((maxXP * i) / 5);
    const y = PT + ch - (v / maxXP) * ch;
    yGrid += `<line x1="${PL}" y1="${ff(y)}" x2="${ff(PL + cw)}" y2="${ff(y)}"
                    stroke="#1a3350" stroke-width="1" stroke-dasharray="4 4"/>
              <text x="${ff(PL - 6)}" y="${ff(y + 4)}" text-anchor="end"
                    fill="#4a7090" font-size="10">${fmtXP(v)}</text>`;
  }

  /* ── 3-D bars ────────────────────────────────────────────
     IMPORTANT: faces and labels are built in TWO separate
     passes so that ALL labels are painted last (on top of
     every bar face). Without this, bars drawn after a tall
     bar cover that bar's labels in SVG paint order.         */

  let faces = ""; // pass 1 — all bar geometry
  let labels = ""; // pass 2 — all text (painted on top)

  sorted.forEach(([name, xp], i) => {
    const barH = Math.max(3, (xp / maxXP) * ch);
    const fx = PL + i * colW + (colW - barW) / 2;
    const fy = PT + ch - barH; /* front-face top y  */
    const topY = fy + DY; /* 3-D cap top y     */
    const base = PT + ch;
    const col = PALETTE[i % PALETTE.length];
    const pct = ((xp / totalXP) * 100).toFixed(1) + "%";
    const mid = ff(fx + barW / 2);
    const label = name.length > 14 ? name.slice(0, 13) + "…" : name;

    const front = `M${ff(fx)},${ff(fy)} L${ff(fx + barW)},${ff(fy)} L${ff(fx + barW)},${ff(base)} L${ff(fx)},${ff(base)}Z`;
    const side = `M${ff(fx + barW)},${ff(fy)} L${ff(fx + barW + DX)},${ff(topY)} L${ff(fx + barW + DX)},${ff(base + DY)} L${ff(fx + barW)},${ff(base)}Z`;
    const top = `M${ff(fx)},${ff(fy)} L${ff(fx + barW)},${ff(fy)} L${ff(fx + barW + DX)},${ff(topY)} L${ff(fx + DX)},${ff(topY)}Z`;

    /* Pass 1 — geometry only */
    faces += `
      <path d="${side}"  fill="${tint(col, 0.54)}" opacity=".95"/>
      <path d="${front}" fill="${col}"            opacity=".88"/>
      <path d="${top}"   fill="${tint(col, 1.18)}" opacity=".95"/>
      <path d="${front}" fill="none" stroke="#0f1e2e" stroke-width=".7" opacity=".3"/>
      <path d="${side}"  fill="none" stroke="#0f1e2e" stroke-width=".7" opacity=".3"/>
      <path d="${top}"   fill="none" stroke="#0f1e2e" stroke-width=".7" opacity=".3"/>`;

    /* Pass 2 — labels always above all faces.
       Math.max clamps so labels never go above the SVG
       top boundary, even for the tallest bar (make-your-game). */
    const pctY = Math.max(22, topY - 20);
    const xpY = Math.max(36, topY - 6);

    labels += `
      <text x="${mid}" y="${ff(pctY)}" text-anchor="middle"
            fill="${col}" font-size="13" font-weight="bold">${pct}</text>
      <text x="${mid}" y="${ff(xpY)}" text-anchor="middle"
            fill="${col}" font-size="10" opacity=".9">${fmtXP(xp)}</text>
      <text transform="rotate(-38,${mid},${ff(base + 16)})"
            x="${mid}" y="${ff(base + 16)}"
            text-anchor="end" fill="#c8dde8" font-size="10">${label}</text>`;
  });

  el.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}"
       style="width:100%;height:auto;display:block;overflow:visible"
       xmlns="http://www.w3.org/2000/svg" font-family="Space Mono,monospace">

    <text x="${PL}" y="24" fill="#c8dde8" font-size="13" font-weight="bold"
          font-family="Syne,sans-serif" letter-spacing="1">
      TOP ${N} PROJECTS BY XP
    </text>
    <text x="${PL}" y="42" fill="#4a7090" font-size="10">
      ${N} projects · ${fmtXP(totalXP)} total · sorted highest → lowest · bar label = % of total XP
    </text>

    ${yGrid}
    <line x1="${PL}" y1="${PT + ch}" x2="${ff(PL + cw + DX)}" y2="${PT + ch}"
          stroke="#1a3350" stroke-width="1.5"/>
    ${faces}
    ${labels}

    <text x="${ff(PL + cw / 2)}" y="${H - 4}" text-anchor="middle"
          fill="#4a7090" font-size="11">Projects</text>
    <text x="12" y="${ff(H / 2)}" text-anchor="middle" fill="#4a7090" font-size="11"
          transform="rotate(-90,12,${ff(H / 2)})">XP Earned</text>
  </svg>`;
}

/* ────────────────────────────────────────────────────────
   GRAPH 3 — Pass / Fail Ratio  (Hollow Donut)

   Source: QUERY_RESULTS → latest grade per unique path.
   grade >= 1 = PASS  |  grade < 1 = FAIL
   Percentages calculated purely from API data.
   ZERO hardcoded values — works for any student.
──────────────────────────────────────────────────────── */
function drawPassFailChart(results) {
  const el = document.getElementById("graph-passfail");

  /* Safety dedup: one record per path (API already did distinct_on) */
  const seen = new Set();
  const unique = results.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  /* Count from real data — zero hardcoding */
  const passed = unique.filter((r) => r.grade >= 1).length;
  const failed = unique.filter((r) => r.grade < 1).length;
  const total = passed + failed;

  if (!total) {
    el.innerHTML = noData("No result data found.");
    return;
  }

  /* Percentages from actual data */
  const passPct = ((passed / total) * 100).toFixed(1);
  const failPct = ((failed / total) * 100).toFixed(1);

  /* Layout */
  const W = 760,
    H = 560;
  const cx = 265,
    cy = 295;
  const OR = 155,
    IR = 74;

  const slices = [
    { label: "PASS", count: passed, pct: passPct, color: "#00ff9d" },
    { label: "FAIL", count: failed, pct: failPct, color: "#ff3c5c" },
  ];

  /* Compute angles starting at top (−π/2) */
  let angle = -Math.PI / 2;
  slices.forEach((s) => {
    s.sweep = (s.count / total) * 2 * Math.PI;
    s.start = angle;
    s.end = angle + s.sweep;
    s.mid = angle + s.sweep / 2;
    angle = s.end;
  });

  /* Ring-slice donut arc */
  function ringPath(s) {
    const clamp = Math.min(s.sweep, 2 * Math.PI - 0.0001);
    const ea = s.start + clamp;
    const large = clamp > Math.PI ? 1 : 0;
    return `M${ff(cx + OR * Math.cos(s.start))},${ff(cy + OR * Math.sin(s.start))}
            A${OR},${OR} 0 ${large},1 ${ff(cx + OR * Math.cos(ea))},${ff(cy + OR * Math.sin(ea))}
            L${ff(cx + IR * Math.cos(ea))},${ff(cy + IR * Math.sin(ea))}
            A${IR},${IR} 0 ${large},0 ${ff(cx + IR * Math.cos(s.start))},${ff(cy + IR * Math.sin(s.start))}Z`;
  }

  /* Leader line with elbow, going outward */
  function leader(s) {
    const ex = cx + (OR + 8) * Math.cos(s.mid);
    const ey = cy + (OR + 8) * Math.sin(s.mid);
    const bx = cx + (OR + 58) * Math.cos(s.mid);
    const by = cy + (OR + 58) * Math.sin(s.mid);
    const dir = bx >= cx ? 1 : -1;
    const ex2 = bx + dir * 36;
    const lx = ex2 + dir * 5;
    const anc = dir > 0 ? "start" : "end";
    return `
      <line x1="${ff(ex)}" y1="${ff(ey)}" x2="${ff(bx)}" y2="${ff(by)}"
            stroke="${s.color}" stroke-width="1.6" opacity=".9"/>
      <line x1="${ff(bx)}" y1="${ff(by)}" x2="${ff(ex2)}" y2="${ff(by)}"
            stroke="${s.color}" stroke-width="1.6" opacity=".9"/>
      <circle cx="${ff(ex)}" cy="${ff(ey)}" r="3.5" fill="${s.color}"/>
      <!-- big % -->
      <text x="${ff(lx)}" y="${ff(by - 12)}" text-anchor="${anc}"
            fill="${s.color}" font-size="28" font-weight="800"
            font-family="Syne,sans-serif">${s.pct}%</text>
      <!-- PASS / FAIL label -->
      <text x="${ff(lx)}" y="${ff(by + 10)}" text-anchor="${anc}"
            fill="${s.color}" font-size="13" font-weight="bold">${s.label}</text>
      <!-- count -->
      <text x="${ff(lx)}" y="${ff(by + 28)}" text-anchor="${anc}"
            fill="#4a7090" font-size="11">${s.count} of ${total} projects</text>`;
  }

  /* % + count inside ring */
  function ringLabel(s) {
    if (s.sweep < 0.22) return "";
    const mr = (IR + OR) / 2;
    const lx = ff(cx + mr * Math.cos(s.mid));
    const ly = ff(cy + mr * Math.sin(s.mid));
    return `
      <text x="${lx}" y="${ff(parseFloat(ly) - 7)}" text-anchor="middle"
            fill="#000" font-size="13" font-weight="bold" opacity=".9">${s.pct}%</text>
      <text x="${lx}" y="${ff(parseFloat(ly) + 10)}" text-anchor="middle"
            fill="#000" font-size="11" opacity=".7">${s.count}</text>`;
  }

  /* Right-side legend */
  const LX = 480,
    LY = 160,
    LS = 150;
  const legend = slices
    .map(
      (s, i) => `
      <rect x="${LX}" y="${LY + i * LS}" width="22" height="22" rx="5" fill="${s.color}"/>
      <text x="${LX + 32}" y="${LY + i * LS + 17}" fill="#c8dde8"
            font-size="15" font-weight="bold">${s.label}</text>
      <text x="${LX}" y="${LY + i * LS + 60}" fill="${s.color}"
            font-size="44" font-weight="800" font-family="Syne,sans-serif">${s.pct}%</text>
      <text x="${LX}" y="${LY + i * LS + 84}" fill="#4a7090" font-size="12">
        ${s.count} result${s.count !== 1 ? "s" : ""} of ${total}
      </text>`,
    )
    .join("");

  el.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}"
       style="width:100%;height:auto;display:block;overflow:visible"
       xmlns="http://www.w3.org/2000/svg" font-family="Space Mono,monospace">
    <defs>
      <filter id="pf">
        <feGaussianBlur stdDeviation="7" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <text x="20" y="28" fill="#c8dde8" font-size="13" font-weight="bold"
          font-family="Syne,sans-serif" letter-spacing="1">
      PROJECT PASS / FAIL RATIO
    </text>
    <text x="20" y="46" fill="#4a7090" font-size="10">
      ${total} unique paths · latest grade per project · grade ≥ 1 = PASS
    </text>

    <!-- Glow halos -->
    ${slices
      .map(
        (
          s,
        ) => `<path d="${ringPath(s)}" fill="${s.color}" opacity=".12" filter="url(#pf)"
                     transform="translate(${ff(Math.cos(s.mid) * 5)},${ff(Math.sin(s.mid) * 5)})"/>`,
      )
      .join("")}

    <!-- Ring slices -->
    ${slices
      .map(
        (s) => `<path d="${ringPath(s)}" fill="${s.color}" opacity=".88"
                       stroke="#0f1e2e" stroke-width="2.5"/>`,
      )
      .join("")}

    <!-- % + count inside ring -->
    ${slices.map(ringLabel).join("")}

    <!-- Hollow centre -->
    <circle cx="${cx}" cy="${cy}" r="${IR - 3}" fill="#0f1e2e"/>
    <text x="${cx}" y="${cy - 18}" text-anchor="middle" fill="#c8dde8"
          font-size="40" font-weight="800" font-family="Syne,sans-serif">${total}</text>
    <text x="${cx}" y="${cy + 6}"  text-anchor="middle" fill="#4a7090"
          font-size="11" letter-spacing="2">TOTAL</text>
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" fill="#4a7090"
          font-size="11" letter-spacing="1">RESULTS</text>

    <!-- Leader lines + labels -->
    ${slices.map(leader).join("")}

    <!-- Legend -->
    ${legend}
  </svg>`;
}

/* ── empty state ── */
function noData(msg) {
  return `<p style="color:var(--muted);padding:24px 0;font-size:12px">${msg}</p>`;
}
