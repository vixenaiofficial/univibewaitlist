// UniVibe Waitlist + Username Reservation (Supabase) — Plain HTML/CSS/JS

// ✅ Your Supabase project values:
const SUPABASE_URL = "https://aizyvmoqzegzxubtvwod.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpenl2bW9xemVnenh1YnR2d29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODEzNDksImV4cCI6MjA4NzE1NzM0OX0.QPa0DTOUNormOHlCzJJwSsxpvasDNTvdZr7u6dT5aSQ";

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const form = document.getElementById("waitlistForm");
const statusBox = document.getElementById("statusBox");
const submitBtn = document.getElementById("submitBtn");

const usernameEl = document.getElementById("username");
const emailEl = document.getElementById("email");
const whatsappEl = document.getElementById("whatsapp");

const levelEl = document.getElementById("level");
const courseEl = document.getElementById("course");

const yearEl = document.getElementById("year");
const usernameHint = document.getElementById("usernameHint");
const honeypot = document.getElementById("company");

const businessWrap = document.getElementById("businessNameWrap");
const businessNameEl = document.getElementById("business_name");

yearEl.textContent = new Date().getFullYear();

function setStatus(message, type) {
  statusBox.textContent = message || "";
  statusBox.classList.remove("ok", "bad");
  if (type === "ok") statusBox.classList.add("ok");
  if (type === "bad") statusBox.classList.add("bad");
}

function normalizeUsername(raw) {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "_");
}

function isValidUsername(u) {
  return /^[a-z0-9_]{3,20}$/.test(u);
}

function normalizePhone(raw) {
  return (raw || "").trim().replace(/\s+/g, "");
}

function isValidPhone(p) {
  // Loose validation: + and 7-15 digits (E.164-ish)
  return /^\+?[0-9]{7,15}$/.test(p);
}

function cleanOptionalText(raw, maxLen) {
  const v = (raw || "").trim();
  if (!v) return null;
  return v.length > maxLen ? v.slice(0, maxLen) : v;
}

function lockButton(locked) {
  submitBtn.disabled = locked;
  submitBtn.style.opacity = locked ? "0.75" : "1";
}

async function checkUsernameAvailability(u) {
  const { data, error } = await sb
    .from("waitlist")
    .select("username")
    .eq("username", u)
    .limit(1);

  if (error) throw error;
  return data.length === 0;
}

// Show/hide business name based on selection
document.querySelectorAll('input[name="is_business"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const isBiz =
      document.querySelector('input[name="is_business"]:checked')?.value === "yes";

    businessWrap.style.display = isBiz ? "grid" : "none";
    if (!isBiz) businessNameEl.value = "";
  });
});

// Username live availability check (debounced)
let usernameCheckTimer = null;
let lastChecked = "";

usernameEl.addEventListener("input", () => {
  clearTimeout(usernameCheckTimer);

  const u = normalizeUsername(usernameEl.value);
  usernameEl.value = u;

  setStatus("", "");
  usernameHint.textContent = "Only letters, numbers, underscore. 3–20 chars.";
  usernameHint.style.color = "rgba(255,255,255,0.55)";

  if (!u || u.length < 3) return;

  if (!isValidUsername(u)) {
    usernameHint.textContent = "Invalid. Use letters, numbers, underscore only.";
    usernameHint.style.color = "rgba(255,92,122,0.92)";
    return;
  }

  usernameCheckTimer = setTimeout(async () => {
    if (u === lastChecked) return;
    lastChecked = u;

    try {
      lockButton(true);
      usernameHint.textContent = "Checking availability…";
      usernameHint.style.color = "rgba(255,255,255,0.55)";

      const free = await checkUsernameAvailability(u);
      if (free) {
        usernameHint.textContent = `✅ @${u} is available`;
        usernameHint.style.color = "rgba(58,245,157,0.90)";
      } else {
        usernameHint.textContent = `❌ @${u} is taken`;
        usernameHint.style.color = "rgba(255,92,122,0.92)";
      }
    } catch (e) {
      usernameHint.textContent = "Could not check username right now.";
      usernameHint.style.color = "rgba(255,92,122,0.92)";
      console.error(e);
    } finally {
      lockButton(false);
    }
  }, 450);
});

// Submit handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("", "");

  // Honeypot spam check
  if (honeypot && honeypot.value.trim().length > 0) {
    setStatus("Thanks! You're on the list.", "ok");
    form.reset();
    businessWrap.style.display = "none";
    return;
  }

  const username = normalizeUsername(usernameEl.value);
  const email = (emailEl.value || "").trim().toLowerCase();
  const whatsapp = normalizePhone(whatsappEl.value);
  const platform = form.querySelector('input[name="platform"]:checked')?.value || "android";

  const level = cleanOptionalText(levelEl?.value, 10);
  const course = cleanOptionalText(courseEl?.value, 80);

  const isBusiness =
    form.querySelector('input[name="is_business"]:checked')?.value === "yes";
  const businessName = cleanOptionalText(businessNameEl?.value, 60);

  if (!isValidUsername(username)) {
    setStatus("Please enter a valid username (3–20, letters/numbers/_).", "bad");
    usernameEl.focus();
    return;
  }

  if (!email || !email.includes("@")) {
    setStatus("Please enter a valid email.", "bad");
    emailEl.focus();
    return;
  }

  if (!isValidPhone(whatsapp)) {
    setStatus("Please enter a valid WhatsApp number (with country code).", "bad");
    whatsappEl.focus();
    return;
  }

  if (isBusiness && (!businessName || businessName.length < 2)) {
    setStatus("Please enter your business name.", "bad");
    businessNameEl.focus();
    return;
  }

  try {
    lockButton(true);
    setStatus("Reserving your username…", "");

    // Re-check availability right before insert
    const free = await checkUsernameAvailability(username);
    if (!free) {
      setStatus(`Sorry, @${username} is already taken. Try another.`, "bad");
      return;
    }

    const payload = {
      username,
      email,
      whatsapp,
      platform,
      level,
      course,
      is_business: isBusiness,
      business_name: isBusiness ? businessName : null,
      created_at: new Date().toISOString(),
      user_agent: navigator.userAgent
    };

    const { error } = await sb.from("waitlist").insert(payload);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        setStatus("That username or email is already registered.", "bad");
      } else if (msg.includes("row") && msg.includes("security")) {
        setStatus("Blocked by Supabase security (RLS). Check your policies.", "bad");
      } else {
        setStatus("Could not submit right now. Please try again.", "bad");
      }
      console.error(error);
      return;
    }

    setStatus(`✅ Done! @${username} is reserved. We'll contact you soon.`, "ok");
    form.reset();
    businessWrap.style.display = "none";

    usernameHint.textContent = "Only letters, numbers, underscore. 3–20 chars.";
    usernameHint.style.color = "rgba(255,255,255,0.55)";
  } catch (err) {
    console.error(err);
    setStatus("Network error. Please try again.", "bad");
  } finally {
    lockButton(false);
  }
});