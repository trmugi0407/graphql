/* api.js — GraphQL client + all queries */

/* ── GQL fetch ──────────────────────────── */
async function gql(query, variables = {}) {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STATE.jwt}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

/* ══════════════════════════════════════════
   QUERIES
   ① Normal  — no arguments, no nesting
   ② Argument — uses $userId variable
   ③ Nested  — object{} inside another type
══════════════════════════════════════════ */

/* ① NORMAL */
const QUERY_USER = `{
  user {
    id
    login
    firstName
    lastName
    createdAt
    campus
  }
}`;

/* ② ARGUMENT — XP transactions */
const QUERY_XP = `
  query GetXP($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        path: { _nilike: "%piscine%" }
      }
      order_by: { createdAt: asc }
    ) {
      id
      amount
      createdAt
      path
      objectId
    }
  }
`;

/* ③ NESTED — object{} inside result
   distinct_on path + order updatedAt desc
   = latest grade per project only           */
const QUERY_RESULTS = `
  query GetResults($userId: Int!) {
    result(
      where: {
        userId: { _eq: $userId }
        grade: { _is_null: false }
      }
      order_by: { path: asc, updatedAt: desc }
      distinct_on: path
    ) {
      id
      grade
      path
      updatedAt
      object {
        id
        name
        type
      }
    }
  }
`;

/* ② ARGUMENT — audit aggregates */
const QUERY_AUDITS = `
  query GetAudits($userId: Int!) {
    upTotal: transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "up" }
      }
    ) {
      aggregate { sum { amount } }
    }
    downTotal: transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "down" }
      }
    ) {
      aggregate { sum { amount } }
    }
  }
`;

/* ② ARGUMENT + ③ NESTED — all skill_ transactions
   No hardcoded skill list.
   Returns whatever skills THIS student has.        */
const QUERY_SKILLS = `
  query GetSkills($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _like: "skill_%" }
      }
      order_by: { amount: desc }
    ) {
      type
      amount
      object { name }
    }
  }
`;
