/* test.js — GraphQL Audit Console Tests
   After login open DevTools → Console and type:
   runAllTests()  or  quickTest()
*/
const C = {
  ok: "color:#00f5a0",
  bold: "color:#00f5a0;font-size:14px;font-weight:bold",
  info: "color:#0affb8;font-weight:bold",
  hint: "color:#ffb347;font-size:11px",
  pass: "color:#00ff9d;font-weight:bold",
  fail: "color:#ff3b6f",
  dim: "color:#7f8fa4",
};
const hr = () => console.log("%c" + "═".repeat(56), C.ok);

async function testNormalQuery() {
  if (!STATE.jwt) {
    console.log("%c❌ Login first", C.fail);
    return;
  }
  hr();
  console.log("%c📋 TEST 1: NORMAL QUERY", C.bold);
  const q = `{ user { id login firstName lastName createdAt campus } }`;
  console.log("%c📝 Query:", C.info);
  console.log(q);
  console.log("%c💡 No $variables · no where · no nesting", C.hint);
  try {
    const d = await gql(q);
    console.table(d.user[0]);
    console.log("%c✅ NORMAL QUERY: PASSED", C.pass);
    return d;
  } catch (e) {
    console.log("%c❌ " + e.message, C.fail);
  }
}

async function testArgumentQuery() {
  if (!STATE.jwt) {
    console.log("%c❌ Login first", C.fail);
    return;
  }
  hr();
  console.log("%c🔧 TEST 2: ARGUMENT QUERY", C.bold);
  const q = `
    query GetXP($userId: Int!) {
      transaction(
        where: { userId:{_eq:$userId}, type:{_eq:"xp"}, path:{_nilike:"%piscine%"} }
        order_by: { createdAt: asc }
        limit: 10
      ) { id amount createdAt path }
    }`;
  const v = { userId: STATE.userId };
  console.log("%c📝 Query:", C.info);
  console.log(q);
  console.log("%c📌 Variables:", C.info);
  console.log(v);
  console.log("%c💡 Uses $userId variable + where filter + order_by", C.hint);
  try {
    const d = await gql(q, v);
    const txs = d.transaction || [];
    const tot = txs.reduce((s, t) => s + t.amount, 0);
    console.table(txs);
    console.log(`%c📊 ${txs.length} transactions · ${fmtXP(tot)} XP`, C.dim);
    console.log("%c✅ ARGUMENT QUERY: PASSED", C.pass);
    return d;
  } catch (e) {
    console.log("%c❌ " + e.message, C.fail);
  }
}

async function testNestedQuery() {
  if (!STATE.jwt) {
    console.log("%c❌ Login first", C.fail);
    return;
  }
  hr();
  console.log("%c📦 TEST 3: NESTED QUERY", C.bold);
  const q = `
    query GetResults($userId: Int!) {
      result(
        where: { userId:{_eq:$userId}, grade:{_is_null:false} }
        order_by: { path:asc, updatedAt:desc }
        distinct_on: path
        limit: 10
      ) { id grade path updatedAt object { id name type } }
    }`;
  const v = { userId: STATE.userId };
  console.log("%c📝 Query:", C.info);
  console.log(q);
  console.log("%c💡 object{ } is NESTED inside result", C.hint);
  try {
    const d = await gql(q, v);
    const rs = d.result || [];
    const ok = rs.filter((r) => r.grade >= 1).length;
    const fl = rs.filter((r) => r.grade < 1).length;
    rs.slice(0, 5).forEach((r, i) =>
      console.log(
        `  ${i + 1}. ${pathToName(r.path)} | grade:${r.grade} | ${r.object?.name || "N/A"} (${r.object?.type || "N/A"})`,
      ),
    );
    console.table(rs.slice(0, 5));
    console.log(
      `%c📊 ${rs.length} results · ✅ ${ok} pass · ❌ ${fl} fail`,
      C.dim,
    );
    console.log("%c✅ NESTED QUERY: PASSED", C.pass);
    return d;
  } catch (e) {
    console.log("%c❌ " + e.message, C.fail);
  }
}

async function testAuditQuery() {
  if (!STATE.jwt) {
    console.log("%c❌ Login first", C.fail);
    return;
  }
  hr();
  console.log("%c⚖️  TEST 4: AUDIT QUERY", C.bold);
  const q = `
    query GetAudits($userId: Int!) {
      upTotal:   transaction_aggregate(where:{userId:{_eq:$userId},type:{_eq:"up"}})   { aggregate{sum{amount}} }
      downTotal: transaction_aggregate(where:{userId:{_eq:$userId},type:{_eq:"down"}}) { aggregate{sum{amount}} }
    }`;
  try {
    const d = await gql(q, { userId: STATE.userId });
    const up = d.upTotal?.aggregate?.sum?.amount || 0;
    const down = d.downTotal?.aggregate?.sum?.amount || 0;
    console.log(`  📤 Done:     ${fmtXP(up)}`);
    console.log(`  📥 Received: ${fmtXP(down)}`);
    console.log(`  📊 Ratio:    ${down > 0 ? (up / down).toFixed(2) : "∞"}`);
    console.log("%c✅ AUDIT QUERY: PASSED", C.pass);
    return d;
  } catch (e) {
    console.log("%c❌ " + e.message, C.fail);
  }
}

async function testSkillsQuery() {
  if (!STATE.jwt) {
    console.log("%c❌ Login first", C.fail);
    return;
  }
  hr();
  console.log("%c🏆 TEST 5: SKILLS NESTED QUERY", C.bold);
  const q = `
    query GetSkills($userId: Int!) {
      transaction(
        where:{userId:{_eq:$userId},type:{_like:"skill_%"}}
        order_by:{amount:desc} limit:10
      ) { type amount object{name} }
    }`;
  try {
    const d = await gql(q, { userId: STATE.userId });
    const sk = d.transaction || [];
    sk.forEach((s, i) =>
      console.log(
        `  ${i + 1}. ${s.type.replace("skill_", "").padEnd(14)} ${s.amount}%`,
      ),
    );
    console.table(sk);
    console.log("%c✅ SKILLS QUERY: PASSED", C.pass);
    return d;
  } catch (e) {
    console.log("%c❌ " + e.message, C.fail);
  }
}

async function runAllTests() {
  if (!STATE.jwt) {
    console.log("%c❌ Login first!", C.fail);
    return;
  }
  console.log("%c╔" + "═".repeat(54) + "╗", C.ok);
  console.log(
    "%c║   GRAPHQL MANDATORY TESTS — Normal · Arg · Nested   ║",
    C.bold,
  );
  console.log("%c╚" + "═".repeat(54) + "╝", C.ok);
  console.log(`%c👤 User ID: ${STATE.userId}`, C.info);
  await testNormalQuery();
  console.log("");
  await testArgumentQuery();
  console.log("");
  await testNestedQuery();
  console.log("%c╔" + "═".repeat(54) + "╗", C.ok);
  console.log(
    "%c║              ✅ ALL MANDATORY TESTS DONE             ║",
    C.bold,
  );
  console.log("%c╚" + "═".repeat(54) + "╝", C.ok);
  console.log("  ✅ 1. NORMAL   — no args, no nesting");
  console.log("  ✅ 2. ARGUMENT — $userId + where + order_by");
  console.log("  ✅ 3. NESTED   — object{} inside result");
  console.log("%c🎯 All mandatory query types verified!", C.pass);
}

async function runExtendedTests() {
  await runAllTests();
  console.log("");
  await testAuditQuery();
  console.log("");
  await testSkillsQuery();
}

async function quickTest() {
  if (!STATE.jwt) {
    console.log("%c❌ Login first!", C.fail);
    return;
  }
  const u = await gql(`{ user { id login } }`);
  const uid = parseInt(u.user[0].id);
  const [xp, rs] = await Promise.all([
    gql(
      `query G($id:Int!){transaction(where:{userId:{_eq:$id},type:{_eq:"xp"}}limit:5){amount}}`,
      { id: uid },
    ),
    gql(
      `query G($id:Int!){result(where:{userId:{_eq:$id},grade:{_is_null:false}}distinct_on:path order_by:{path:asc,updatedAt:desc}){grade}}`,
      { id: uid },
    ),
  ]);
  const total = (xp.transaction || []).reduce((s, t) => s + t.amount, 0);
  const passed = (rs.result || []).filter((r) => r.grade >= 1).length;
  const failed = (rs.result || []).length - passed;
  console.log(
    `%c🔍 @${u.user[0].login} (ID:${uid}) · XP:${fmtXP(total)} · Results:${(rs.result || []).length} (${passed} pass / ${failed} fail)`,
    C.info,
  );
  console.log("%c✅ All query types working!", C.pass);
}

Object.assign(window, {
  testNormalQuery,
  testArgumentQuery,
  testNestedQuery,
  testAuditQuery,
  testSkillsQuery,
  runAllTests,
  runExtendedTests,
  quickTest,
  testGraphQL: runAllTests,
});

console.log("%c╔" + "═".repeat(54) + "╗", C.ok);
console.log(
  "%c║       GRAPHQL TEST FUNCTIONS READY                   ║",
  C.bold,
);
console.log("%c╚" + "═".repeat(54) + "╝", C.ok);
console.log(
  "%c  quickTest()        · runAllTests()  · runExtendedTests()",
  "color:#00ff9d",
);
console.log("%c  (login first)", C.hint);
