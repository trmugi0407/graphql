/* auth.js — login / logout */

async function handleLogin() {
  const identifier = document.getElementById("id-input").value.trim();
  const password = document.getElementById("pw-input").value;
  const btn = document.getElementById("login-btn");

  setErr("");
  if (!identifier || !password) {
    setErr("Please enter your username / email and password.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Authenticating…';

  try {
    const res = await fetch(SIGNIN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(identifier + ":" + password)}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const msgs = {
        401: "✗ Incorrect username / email or password.",
        403: "✗ Access forbidden — check your credentials.",
      };
      setErr(msgs[res.status] || `✗ Server error (${res.status}).`);
      return;
    }

    /* Token may arrive as bare string or JSON-wrapped */
    const raw = await res.text();
    try {
      const p = JSON.parse(raw);
      STATE.jwt = typeof p === "string" ? p : p.token || p.access_token || raw;
    } catch {
      STATE.jwt = raw.replace(/^"|"$/g, "");
    }

    /* Decode Hasura JWT to extract userId */
    try {
      const b64 = STATE.jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(b64));
      const claims = payload["https://hasura.io/jwt/claims"] || {};
      STATE.userId = parseInt(
        claims["x-hasura-user-id"] || payload.sub || payload.id,
      );
    } catch (e) {
      console.warn("JWT decode:", e);
    }

    await loadProfile();
  } catch (e) {
    setErr("Network error: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Sign In";
  }
}

function handleLogout() {
  STATE.jwt = null;
  STATE.userId = null;
  STATE.profileData = {};
  document.getElementById("hero-badges").innerHTML =
    '<span class="badge badge-cyan">01 Founders</span>';
  document.getElementById("profile-page").classList.add("hidden");
  document.getElementById("login-page").classList.remove("hidden");
  document.getElementById("pw-input").value = "";
  setErr("");
}

function setErr(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.classList.toggle("show", !!msg);
}

document.addEventListener("keydown", (e) => {
  if (
    e.key === "Enter" &&
    !document.getElementById("login-page").classList.contains("hidden")
  )
    handleLogin();
});
