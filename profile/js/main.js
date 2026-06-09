/* main.js — load profile, call renderers + charts */

async function loadProfile() {
  showLoad(true);
  try {
    /* ① Normal query */
    const ud = await gql(QUERY_USER);
    const user = ud.user[0];
    STATE.userId = parseInt(user.id);

    /* ② Argument + ③ Nested — parallel */
    const [xd, rd, ad, sd] = await Promise.all([
      gql(QUERY_XP, { userId: STATE.userId }),
      gql(QUERY_RESULTS, { userId: STATE.userId }),
      gql(QUERY_AUDITS, { userId: STATE.userId }),
      gql(QUERY_SKILLS, { userId: STATE.userId }),
    ]);

    STATE.profileData = { user, xd, rd, ad, sd };

    /* Profile sections */
    renderHero(user);
    renderXP(xd.transaction);
    renderAudit(ad, user);
    renderSkills(sd.transaction);
    renderRecentTx(xd.transaction);

    /* ── Three SVG graphs ──────────────────────────────
       ① XP Over Time   — xd.transaction (line chart)
       ② Projects by XP — xd.transaction (3-D column)
       ③ Pass/Fail      — rd.result      (donut)
    ─────────────────────────────────────────────────── */
    drawXPGraph(xd.transaction);
    drawProjectsChart(xd.transaction);
    drawPassFailChart(rd.result);

    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("profile-page").classList.remove("hidden");
    window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    setErr("Failed to load profile: " + e.message);
  } finally {
    showLoad(false);
  }
}

function showLoad(on) {
  document.getElementById("loading").classList.toggle("show", on);
}
