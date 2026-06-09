# GQL Profile · 01 Founders

A personal profile page that reads your school data live from the
GraphQL API at `learn.01founders.co` and displays it as a dark-themed
dashboard with three SVG data-visualisation graphs.

---

## Live Demo

Deploy the `profile/` folder to any static host:

| Host | Steps |
|---|---|
| **GitHub Pages** | Push repo → Settings → Pages → branch `main` / root |
| **Netlify** | Drag & drop the `profile/` folder onto netlify.com/drop |
| **Vercel** | `vercel deploy` inside the `profile/` folder |

> **Local development** — serve over HTTP, not `file://`:
> ```bash
> cd profile
> python3 -m http.server 8080
> # open http://localhost:8080
> ```

---

## Project Structure

```
profile/
├── index.html          ← Pure HTML, no inline CSS or JS
├── css/
│   └── style.css       ← All styles & design tokens
└── js/
    ├── config.js       ← Domain, shared STATE, colour palette
    ├── api.js          ← GraphQL client + all 5 queries
    ├── auth.js         ← Login / logout / JWT decode
    ├── render.js       ← Profile section renderers + utilities
    ├── charts.js       ← Three SVG graphs
    ├── main.js         ← loadProfile() — ties everything together
    ├── test.js         ← Console-based query audit tests
    └── test-panel.js   ← Visual in-page GraphiQL-style test panel
```

---

## Profile Sections

| # | Section | Data source |
|---|---|---|
| 1 | **User Identity** — login, full name, campus, join year | `QUERY_USER` |
| 2 | **XP & Progress** — total XP, avg per project, largest grant, first earned date | `QUERY_XP` |
| 3 | **Audit Ratio** — done ÷ received, animated progress bar, status badge | `QUERY_AUDITS` |
| 4 | **Top Skills** — animated progress bars, fully dynamic, no hardcoded skill names | `QUERY_SKILLS` |
| + | **Recent Transactions** — last 8 XP grants with date (bonus section) | `QUERY_XP` |

---

## Statistical Graphs

All three graphs are **zero hardcoding** — data comes entirely from the API.

### ① XP Over Time — Line + Area Chart
- X-axis shows real calendar dates from `createdAt`
- Y-axis shows cumulative XP
- Green dot at the end marks total XP earned
- Area fill gives a visual sense of progress acceleration

### ② Top Projects by XP — 3-D Column Chart
- Sorted by **XP descending** — tallest bar (most XP) on the left
- Each bar shows **% of total XP** and **raw kB value** above the 3-D cap
- Labels are rendered in a **second pass** after all bar faces, so they
  are always visible regardless of bar height
- Label Y positions are **clamped** (`Math.max`) so they never clip
  outside the SVG top boundary even for the tallest bar
- **Dynamic first-wink removal** — two guards, no project names hardcoded:
  - Guard A: entries below **0.8% of grand total** are filtered out
  - Guard B: `.slice(0, 9)` caps the chart at 9 bars maximum
- Works for any student at any level

### ③ Pass / Fail Ratio — Hollow Donut Chart
- `grade >= 1` → **PASS** (green)
- `grade < 1`  → **FAIL** (red)
- `distinct_on: path` with `order_by: updatedAt desc` ensures each
  project is counted **once** using its latest grade
- Leader lines show large `%` + label + count outside the ring
- Smaller `%` and count labels inside the ring
- Right-side legend with colour swatch, large %, and result count
- Total shown in the hollow centre

---

## GraphQL Queries

### ① Normal — no arguments, no nesting
```graphql
{
  user {
    id
    login
    firstName
    lastName
    createdAt
    campus
  }
}
```

### ② With argument — `$userId` variable + `where` filter
```graphql
query GetXP($userId: Int!) {
  transaction(
    where: {
      userId: { _eq: $userId }
      type:   { _eq: "xp" }
      path:   { _nilike: "%piscine%" }
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
```

### ③ Nested — `object {}` inside `result`
```graphql
query GetResults($userId: Int!) {
  result(
    where: {
      userId: { _eq: $userId }
      grade:  { _is_null: false }
    }
    order_by: { path: asc, updatedAt: desc }
    distinct_on: path
  ) {
    id
    grade
    path
    updatedAt
    object {        # ← nested type
      id
      name
      type
    }
  }
}
```

### Additional queries
- **`QUERY_AUDITS`** — argument query using `transaction_aggregate`
  for `up` / `down` totals
- **`QUERY_SKILLS`** — argument + nested: `transaction` where
  `type _like "skill_%"` with nested `object { name }`

---

## Authentication

| Detail | Value |
|---|---|
| Endpoint | `https://learn.01founders.co/api/auth/signin` |
| Method | `POST` with `Authorization: Basic base64(login:password)` |
| Accepts | `username:password` **or** `email:password` |
| Token storage | `STATE.jwt` in memory only — never `localStorage` |
| User ID | Decoded from Hasura JWT claim `x-hasura-user-id` |
| Every GQL request | `Authorization: Bearer <token>` |
| Invalid credentials | HTTP 401/403 → red error message on screen |
| Logout | Clears `STATE.jwt` + `STATE.userId`, returns to login |

---

## Testing the Queries

### Console tests (DevTools → Console)

Log in first, then type any command:

```
quickTest()           one-line check — Normal · Argument · Nested
runAllTests()         full output for all three mandatory query types
runExtendedTests()    all 5 tests including Audits + Skills
testNormalQuery()     Normal query only
testArgumentQuery()   Argument query only
testNestedQuery()     Nested query only
testAuditQuery()      Audit aggregate query
testSkillsQuery()     Skills nested query
```

### Visual test panel — own GraphiQL (bonus)

Click **🧪 Test Queries** in the navigation bar. A slide-up panel
runs ① Normal, ② Argument, ③ Nested queries live and shows results
without needing DevTools — fulfils the *"own GraphiQL"* bonus.

---

## Audit Checklist

### Functional

| Check | Status | Detail |
|---|---|---|
| Invalid credentials → error | ✅ | Red message for HTTP 401 / 403 |
| Valid login loads profile | ✅ | Basic auth → JWT → all sections render |
| Three required profile sections | ✅ | Identity · XP & Progress · Audit Ratio |
| Section data matches GraphiQL | ✅ | Values fetched live from API, no caching |
| Fourth statistics section | ✅ | "Statistical Analysis" with 3 SVG graphs |
| At least two different SVG graphs | ✅ | Line chart + 3-D column + hollow donut |
| Graph data is accurate | ✅ | All values calculated from API responses |
| Hosted and accessible online | ✅ | Static HTML — GitHub Pages / Netlify |
| Logout works | ✅ | JWT cleared, profile hidden, login shown |

### General

| Check | Status | Detail |
|---|---|---|
| Normal query | ✅ | `QUERY_USER` — no `$variables`, no nesting |
| Argument query | ✅ | `QUERY_XP`, `QUERY_AUDITS` — `$userId` + `where` |
| Nested query | ✅ | `QUERY_RESULTS`, `QUERY_SKILLS` — `object {}` inside result |

### Bonus

| Bonus | Status | Detail |
|---|---|---|
| Extra sections beyond three | ✅ | Top Skills + Recent Transactions |
| Extra graphs beyond two | ✅ | Three graphs (minimum is two) |
| Own GraphiQL | ✅ | Visual test panel (`test-panel.js`) in the nav bar |
| UI respects good practices | ✅ | Responsive, semantic HTML, ARIA labels, colour contrast, animations |

---


Hosting the graphql web app here is the link:
https://app.netlify.com/projects/graphql-mtumurba/overview

