/* ============================================================
   AURORA WEATHER v2 — app.js
   Vanilla ES6+ · SPA hash router · Open-Meteo API
   ============================================================ */
(() => {
  "use strict";

  /* ---------------- Config & state ---------------- */
  const API = {
    geo: "https://geocoding-api.open-meteo.com/v1/search",
    forecast: "https://api.open-meteo.com/v1/forecast",
    air: "https://air-quality-api.open-meteo.com/v1/air-quality",
  };
  const DEFAULT_CITIES = [
    { name: "Delhi", lat: 28.6139, lon: 77.209, country: "India" },
    { name: "London", lat: 51.5074, lon: -0.1278, country: "United Kingdom" },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503, country: "Japan" },
    { name: "New York", lat: 40.7128, lon: -74.006, country: "United States" },
    { name: "Dubai", lat: 25.2048, lon: 55.2708, country: "United Arab Emirates" },
    { name: "Sydney", lat: -33.8688, lon: 151.2093, country: "Australia" },
  ];

  const store = {
    settings: load("aurora.settings", { temp: "C", wind: "kmh", press: "hPa", theme: "auto" }),
    saved: load("aurora.saved", DEFAULT_CITIES),
    current: load("aurora.current", DEFAULT_CITIES[0]),
    data: null,          // last forecast result
    air: null,           // last air-quality result
  };

  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

  /* ---------------- DOM helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  /* ---------------- Weather code mapping ---------------- */
  const WMO = {
    0:  { t: "Clear sky",       k: "clear" },
    1:  { t: "Mainly clear",    k: "clear" },
    2:  { t: "Partly cloudy",   k: "clouds" },
    3:  { t: "Overcast",        k: "clouds" },
    45: { t: "Fog",             k: "fog" },
    48: { t: "Rime fog",        k: "fog" },
    51: { t: "Light drizzle",   k: "rain" },
    53: { t: "Drizzle",         k: "rain" },
    55: { t: "Heavy drizzle",   k: "rain" },
    56: { t: "Freezing drizzle",k: "rain" },
    57: { t: "Freezing drizzle",k: "rain" },
    61: { t: "Light rain",      k: "rain" },
    63: { t: "Rain",            k: "rain" },
    65: { t: "Heavy rain",      k: "rain" },
    66: { t: "Freezing rain",   k: "rain" },
    67: { t: "Freezing rain",   k: "rain" },
    71: { t: "Light snow",      k: "snow" },
    73: { t: "Snow",            k: "snow" },
    75: { t: "Heavy snow",      k: "snow" },
    77: { t: "Snow grains",    k: "snow" },
    80: { t: "Rain showers",    k: "rain" },
    81: { t: "Rain showers",    k: "rain" },
    82: { t: "Violent showers", k: "rain" },
    85: { t: "Snow showers",    k: "snow" },
    86: { t: "Snow showers",    k: "snow" },
    95: { t: "Thunderstorm",    k: "storm" },
    96: { t: "Storm + hail",    k: "storm" },
    99: { t: "Storm + hail",    k: "storm" },
  };
  const wmo = (code) => WMO[code] || { t: "—", k: "clouds" };

  /* ---------------- Animated weather icon (CSS) ---------------- */
  function weatherIcon(code, size) {
    const { k } = wmo(code);
    const wrap = el("div", `wi wi-${k}`);
    wrap.style.width = wrap.style.height = (size || 64) + "px";
    if (k === "clear") {
      const rays = el("div", "rays");
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("span");
        s.style.transform = `rotate(${i * 45}deg)`;
        rays.appendChild(s);
      }
      wrap.appendChild(rays);
      wrap.appendChild(el("div", "core"));
    } else if (k === "clouds" || k === "fog") {
      if (k === "fog") {
        const lines = el("div", "lines");
        for (let i = 0; i < 3; i++) lines.appendChild(document.createElement("span"));
        wrap.appendChild(lines);
      } else {
        wrap.appendChild(el("div", "cloud"));
      }
    } else if (k === "rain" || k === "snow" || k === "storm") {
      wrap.appendChild(el("div", "cloud"));
      if (k === "storm") {
        const flash = el("div", "flash");
        const bolt = el("div", "bolt");
        bolt.innerHTML = '<svg viewBox="0 0 16 30"><path d="M9 0 0 18h5l-2 12L16 10h-5z" fill="#ffd23a"/></svg>';
        wrap.appendChild(bolt); wrap.appendChild(flash);
      }
      const cls = k === "snow" ? "flake" : "drop";
      const n = k === "snow" ? 5 : 6;
      for (let i = 0; i < n; i++) {
        const d = el("div", cls);
        d.style.left = `${16 + i * (62 / n)}%`;
        d.style.animationDelay = `${(i * 0.18) % 1}s`;
        if (k === "snow") d.style.animationDuration = `${2 + (i % 3) * 0.5}s`;
        wrap.appendChild(d);
      }
    }
    return wrap;
  }

  /* ---------------- Unit conversions ---------------- */
  const conv = {
    temp: (c) => store.settings.temp === "F" ? c * 9 / 5 + 32 : c,
    tempSym: () => store.settings.temp === "F" ? "°F" : "°C",
    wind: (kmh) => store.settings.wind === "mph" ? kmh * 0.621371 : kmh,
    windSym: () => store.settings.wind === "mph" ? "mph" : "km/h",
    press: (hpa) => store.settings.press === "mmHg" ? hpa * 0.750062 : hpa,
    pressSym: () => store.settings.press === "mmHg" ? "mmHg" : "hPa",
  };
  const fmt = (n, d = 0) => {
    if (n == null || isNaN(n)) return "—";
    return Number(n).toFixed(d);
  };

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => (t.hidden = true), 350);
    }, 2600);
  }

  /* ---------------- API client ---------------- */
  async function api(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function geocode(city) {
    const url = `${API.geo}?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
    const j = await api(url);
    return (j.results || []).map(r => ({
      name: r.name,
      country: r.country || "",
      region: r.admin1 || "",
      lat: r.latitude, lon: r.longitude,
      tz: r.timezone,
    }));
  }

  async function getForecast(lat, lon) {
    const params = [
      "current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day,precipitation",
      "hourly=temperature_2m,weather_code,precipitation_probability",
      "daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum",
      "timezone=auto", "forecast_days=7",
    ].join("&");
    return api(`${API.forecast}?latitude=${lat}&longitude=${lon}&${params}`);
  }

  async function getAir(lat, lon) {
    try {
      return await api(`${API.air}?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,us_aqi`);
    } catch { return null; }
  }

  /* ---------------- Router ---------------- */
  const routes = ["/", "/forecast", "/maps", "/settings"];
  const pages = {
    "/": $("#page-home"),
    "/forecast": $("#page-forecast"),
    "/maps": $("#page-maps"),
    "/settings": $("#page-settings"),
  };

  function currentRoute() {
    const h = location.hash.replace(/^#/, "");
    return routes.includes(h) ? h : "/";
  }

  function router() {
    const route = currentRoute();
    Object.entries(pages).forEach(([r, node]) => {
      const active = r === route;
      node.hidden = !active;
      if (active) {
        node.classList.remove("is-entering");
        void node.offsetWidth; // reflow to restart animation
        node.classList.add("is-entering");
      }
    });
    $$(".nav-item").forEach(n => {
      const on = n.dataset.route === route;
      n.classList.toggle("active", on);
      n.setAttribute("aria-current", on ? "page" : "false");
    });
    moveNavIndicator(route);
    if (route === "/maps") renderSaved();
    if (route === "/forecast") renderForecast();
    if (route === "/settings") renderSettings();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function moveNavIndicator(route) {
    const nav = $(".bottomnav");
    const item = $(`.nav-item[data-route="${route}"]`);
    const ind = $("#navIndicator");
    if (!item) return;
    const navRect = nav.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    ind.style.left = (r.left - navRect.left) + "px";
    ind.style.width = r.width + "px";
  }

  /* ---------------- Count-up animation ---------------- */
  function countUp(node, target, opts = {}) {
    const dur = opts.dur || 1100;
    const dec = opts.dec || 0;
    const sym = opts.sym || "";
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      node.textContent = fmt(val, dec) + sym;
      if (p < 1) requestAnimationFrame(frame);
      else node.textContent = fmt(target, dec) + sym;
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- Ripple effect ---------------- */
  function attachRipple() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-primary, .btn-danger, .seg, .nav-item");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const ripple = el("span", "ripple");
      const size = Math.max(r.width, r.height);
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = (e.clientX - r.left - size / 2) + "px";
      ripple.style.top = (e.clientY - r.top - size / 2) + "px";
      if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }

  /* ---------------- Particle background ---------------- */
  const canvas = $("#particles");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let particleMode = null;

  function resizeCanvas() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  function setParticles(mode) {
    if (mode === particleMode) return;
    particleMode = mode;
    particles = [];
    if (!mode) return;
    const w = window.innerWidth, h = window.innerHeight;
    const count = mode === "rain" ? 90 : mode === "snow" ? 70 : 0;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        l: mode === "rain" ? 10 + Math.random() * 14 : 2 + Math.random() * 4,
        s: mode === "rain" ? 6 + Math.random() * 8 : 0.6 + Math.random() * 1.4,
        d: Math.random() * 0.6 - 0.3,
      });
    }
  }
  function drawParticles() {
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    if (!particleMode) { requestAnimationFrame(drawParticles); return; }
    for (const p of particles) {
      if (particleMode === "rain") {
        ctx.strokeStyle = "rgba(160,200,255,0.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.d * 4, p.y + p.l);
        ctx.stroke();
        p.y += p.s; p.x += p.d * 1.5;
        if (p.y > h) { p.y = -p.l; p.x = Math.random() * w; }
      } else if (particleMode === "snow") {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.l / 2, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.s; p.x += Math.sin(p.y * 0.02) * 0.6;
        if (p.y > h) { p.y = -4; p.x = Math.random() * w; }
      }
    }
    requestAnimationFrame(drawParticles);
  }

  function applyTheme(weatherKey, isDay) {
    let key = weatherKey;
    if (!isDay && (key === "clear" || key === "clouds")) key = "night";
    document.documentElement.setAttribute("data-weather", key);
    // particle overlay
    setParticles(key === "rain" || key === "storm" ? "rain" : key === "snow" ? "snow" : null);
  }

  /* ---------------- Theme (auto/dark/light) ---------------- */
  function applyUserTheme() {
    const s = store.settings.theme;
    let resolved;
    if (s === "auto") {
      resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } else {
      resolved = s;
    }
    document.documentElement.setAttribute("data-theme", resolved === "light" ? "light" : "dark");
  }
  // react to OS theme changes when in auto mode
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      if (store.settings.theme === "auto") applyUserTheme();
    });
  }

  /* ---------------- Search with autocomplete ---------------- */
  let searchTimer, activeIdx = -1, lastResults = [];
  const searchInput = $("#searchInput");
  const searchResults = $("#searchResults");
  const searchClear = $("#searchClear");

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    searchClear.hidden = !q;
    clearTimeout(searchTimer);
    if (q.length < 2) { hideResults(); return; }
    searchTimer = setTimeout(() => doSearch(q), 320);
  });
  searchInput.addEventListener("focus", () => {
    if (lastResults.length && searchInput.value.trim().length >= 2) showResults();
  });
  searchClear.addEventListener("click", () => {
    searchInput.value = ""; searchClear.hidden = true; hideResults(); searchInput.focus();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) hideResults();
  });
  searchInput.addEventListener("keydown", (e) => {
    const items = $$(".search-results li");
    if (!items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); activeIdx = (activeIdx + 1) % items.length; }
    else if (e.key === "ArrowUp") { e.preventDefault(); activeIdx = (activeIdx - 1 + items.length) % items.length; }
    else if (e.key === "Enter") { e.preventDefault(); items[activeIdx]?.click(); return; }
    else if (e.key === "Escape") { hideResults(); return; }
    else return;
    items.forEach((it, i) => it.classList.toggle("active", i === activeIdx));
  });

  async function doSearch(q) {
    try {
      const res = await geocode(q);
      lastResults = res;
      activeIdx = -1;
      if (!res.length) {
        searchResults.innerHTML = '<li class="search-empty">No cities found.</li>';
      } else {
        searchResults.innerHTML = res.map((r, i) =>
          `<li role="option" data-i="${i}" tabindex="-1">
             <span class="loc-pin-sm" aria-hidden="true">📍</span>
             <span><span class="res-name">${escapeHtml(r.name)}</span>
             <span class="res-sub">${escapeHtml([r.region, r.country].filter(Boolean).join(", "))}</span></span>
           </li>`).join("");
        $$(".search-results li").forEach(li => {
          li.addEventListener("click", () => {
            const r = lastResults[+li.dataset.i];
            selectCity(r);
          });
        });
      }
      showResults();
    } catch { searchResults.innerHTML = '<li class="search-empty">Search failed. Try again.</li>'; showResults(); }
  }
  function showResults() {
    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  }
  function hideResults() {
    searchResults.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
  }
  function selectCity(c) {
    store.current = c;
    save("aurora.current", c);
    searchInput.value = "";
    searchClear.hidden = true;
    hideResults();
    toast(`Loading ${c.name}…`);
    loadWeather(c);
    location.hash = "#/";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }

  /* ---------------- Load weather orchestration ---------------- */
  async function loadWeather(loc) {
    showSkeleton(true);
    try {
      const [data, air] = await Promise.all([getForecast(loc.lat, loc.lon), getAir(loc.lat, loc.lon)]);
      store.data = data; store.air = air;
      renderHome();
      applyUserTheme();
      if (currentRoute() === "/forecast") renderForecast();
    } catch (e) {
      console.error(e);
      toast("Couldn't load weather. Check connection.");
    } finally {
      showSkeleton(false);
    }
  }

  function showSkeleton(on) {
    const sk = $("#skeletonWrap");
    const home = $("#page-home");
    sk.hidden = !on;
    home.style.visibility = on ? "hidden" : "visible";
  }

  /* ---------------- Render HOME ---------------- */
  function renderHome() {
    const d = store.data; if (!d) return;
    const c = d.current;
    const loc = store.current;
    const isDay = !!c.is_day;
    const w = wmo(c.weather_code);

    applyTheme(w.k, isDay);

    $("#heroCity").textContent = loc.name;
    $("#heroCountry").textContent = [loc.region || loc.country, loc.country].filter(Boolean).join(", ") || loc.name;

    const heroIcon = $("#heroIcon");
    heroIcon.innerHTML = "";
    heroIcon.appendChild(weatherIcon(c.weather_code, 76));

    countUp($("#heroTemp"), conv.temp(c.temperature_2m));
    $("#heroDeg").textContent = store.settings.temp === "F" ? "°F" : "°";
    $("#heroCond").textContent = w.t;
    $("#heroFeels").textContent = fmt(conv.temp(c.apparent_temperature), 0) + "°";
    const now = new Date();
    $("#heroTime").textContent = "Updated " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // stats
    countUp($("#statHumidity"), c.relative_humidity_2m, { sym: "" });
    $("#barHumidity").style.width = Math.min(c.relative_humidity_2m, 100) + "%";

    countUp($("#statWind"), conv.wind(c.wind_speed_10m));
    $$('[data-unit="speed"]').forEach(n => n.textContent = conv.windSym());
    const needle = $("#compassNeedle");
    if (needle) needle.style.transform = `rotate(${c.wind_direction_10m}deg)`;
    // Show cardinal direction (N, NE, E, ...) next to wind speed
    const cardinals = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    const dirEl = $("#windDir");
    if (dirEl) dirEl.textContent = cardinals[Math.round(c.wind_direction_10m / 22.5) % 16];

    countUp($("#statPressure"), conv.press(c.surface_pressure));
    $$('[data-unit="pressure"]').forEach(n => n.textContent = conv.pressSym());
    const pressPct = Math.max(0, Math.min(100, (c.surface_pressure - 950) / 100 * 100));
    $("#barPressure").style.width = pressPct + "%";

    const uv = d.daily.uv_index_max?.[0] ?? 0;
    countUp($("#statUv"), uv, { dec: 1 });
    const uvDot = $("#uvDot");
    uvDot.style.left = Math.min(uv * 10, 100) + "%";
    $("#uvLabel").textContent = uvLabel(uv);

    // hourly
    renderHourly(d);

    // sun arc
    renderSunArc(d, isDay);

    // air quality
    renderAir(store.air);
  }

  function uvLabel(uv) {
    if (uv < 3) return "Low";
    if (uv < 6) return "Moderate";
    if (uv < 8) return "High";
    if (uv < 11) return "Very High";
    return "Extreme";
  }

  function renderHourly(d) {
    const wrap = $("#hourlyScroll");
    wrap.innerHTML = "";
    const nowIdx = d.hourly.time.findIndex(t => new Date(t) >= new Date());
    const start = nowIdx < 0 ? 0 : nowIdx;
    for (let i = start; i < Math.min(start + 24, d.hourly.time.length); i++) {
      const t = new Date(d.hourly.time[i]);
      const item = el("div", "hour-item" + (i === start ? " now" : ""));
      const hr = t.getHours();
      const label = i === start ? "Now" : (hr % 12 === 0 ? "12" : hr % 12) + (hr < 12 ? "a" : "p");
      item.appendChild(el("div", "hour-time", label));
      const ic = el("div", "hour-ic");
      ic.appendChild(weatherIcon(d.hourly.weather_code[i], 30));
      item.appendChild(ic);
      item.appendChild(el("div", "hour-temp", fmt(conv.temp(d.hourly.temperature_2m[i]), 0) + "°"));
      const pop = d.hourly.precipitation_probability?.[i] ?? 0;
      if (pop > 5) item.appendChild(el("div", "hour-pop", pop + "%"));
      wrap.appendChild(item);
    }
  }

  /* ---------------- Sun arc ---------------- */
  function renderSunArc(d, isDay) {
    const sunrise = new Date(d.daily.sunrise[0]);
    const sunset = new Date(d.daily.sunset[0]);
    const now = new Date();
    $("#sunrise").textContent = sunrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("#sunset").textContent = sunset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // arc path: M20,140 Q160,-20 300,140  -> param t in [0,1]
    let t = (now - sunrise) / (sunset - sunrise);
    t = Math.max(0, Math.min(1, t));
    const pt = quadBezier({ x: 20, y: 140 }, { x: 160, y: -20 }, { x: 300, y: 140 }, t);
    const marker = $("#sunMarker");
    marker.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
    const fill = $("#sunArcFill");
    const totalLen = 460;
    fill.style.strokeDashoffset = totalLen - (totalLen * t);
    // Show day length (duration between sunrise and sunset)
    const dayLenMs = sunset - sunrise;
    const hours = Math.floor(dayLenMs / 3600000);
    const mins = Math.floor((dayLenMs % 3600000) / 60000);
    const dayLenEl = $("#dayLength");
    if (dayLenEl) dayLenEl.textContent = `${hours}h ${mins}m`;
  }
  function quadBezier(p0, p1, p2, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    };
  }

  /* ---------------- Air quality ---------------- */
  function renderAir(air) {
    const aqiVal = $("#aqiValue"), badge = $("#aqiBadge");
    if (!air || !air.current) {
      aqiVal.textContent = "—"; badge.textContent = "N/A";
      badge.style.background = "rgba(255,255,255,.1)"; badge.style.color = "var(--text-dim)";
      $("#pm25").textContent = "—"; $("#pm10").textContent = "—"; return;
    }
    const aqi = air.current.us_aqi ?? 0;
    countUp(aqiVal, aqi);
    const { label, color } = aqiInfo(aqi);
    badge.textContent = label;
    badge.style.background = color + "33";
    badge.style.color = color;
    badge.style.borderColor = color + "55";
    $("#pm25").textContent = fmt(air.current.pm2_5, 1);
    $("#pm10").textContent = fmt(air.current.pm10, 1);
  }
  function aqiInfo(aqi) {
    if (aqi <= 50)  return { label: "Good",      color: "#4ade80" };
    if (aqi <= 100) return { label: "Moderate",  color: "#facc15" };
    if (aqi <= 150) return { label: "Unhealthy*", color: "#fb923c" };
    if (aqi <= 200) return { label: "Unhealthy",  color: "#ef4444" };
    if (aqi <= 300) return { label: "Very Bad",   color: "#a855f7" };
    return { label: "Hazardous", color: "#7f1d1d" };
  }

  /* ---------------- Render FORECAST ---------------- */
  function renderForecast() {
    const d = store.data; if (!d) { toast("No forecast data yet."); return; }
    drawTempChart(d);
    drawPrecipBars(d);
    renderDayList(d);
  }

  function drawTempChart(d) {
    const svg = $("#tempChart");
    const W = 320, H = 170, padX = 18, padTop = 24, padBot = 28;
    const maxs = d.daily.temperature_2m_max, mins = d.daily.temperature_2m_min;
    const max = Math.max(...maxs), min = Math.min(...mins);
    const range = Math.max(max - min, 1);
    const stepX = (W - padX * 2) / (maxs.length - 1);
    const yFor = (v) => padTop + (1 - (v - min) / range) * (H - padTop - padBot);

    // defs
    let html = `<defs>
      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#6ea8ff"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6ea8ff" stop-opacity=".35"/><stop offset="1" stop-color="#6ea8ff" stop-opacity="0"/></linearGradient>
      <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>
    </defs>`;
    // grid
    for (let i = 0; i <= 3; i++) {
      const y = padTop + (i / 3) * (H - padTop - padBot);
      html += `<line class="grid-line" x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}"/>`;
    }
    // area + line points for highs
    const ptsMax = maxs.map((v, i) => `${padX + i * stepX},${yFor(v)}`).join(" ");
    const ptsMin = mins.map((v, i) => `${padX + i * stepX},${yFor(v)}`).join(" ");
    const areaPath = `M ${padX},${H - padBot} L ${ptsMax} L ${padX + (maxs.length - 1) * stepX},${H - padBot} Z`;
    html += `<path class="area" d="${areaPath}"/>`;
    html += `<polyline class="line" points="${ptsMin}" />`;
    html += `<polyline class="line" points="${ptsMax}" style="stroke:url(#lineGrad)"/>`;

    // dots + labels + x-axis
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    maxs.forEach((v, i) => {
      const x = padX + i * stepX;
      const dayName = days[new Date(d.daily.time[i]).getDay()];
      html += `<text class="axis-label" x="${x}" y="${H - 10}" text-anchor="middle">${dayName}</text>`;
      html += `<circle class="dot max" cx="${x}" cy="${yFor(v)}" r="3.5" style="animation-delay:${i * 80}ms"/>`;
      html += `<text class="label" x="${x}" y="${yFor(v) - 8}" text-anchor="middle">${fmt(conv.temp(v),0)}°</text>`;
      html += `<circle class="dot min" cx="${x}" cy="${yFor(mins[i])}" r="3" style="animation-delay:${i * 80 + 60}ms"/>`;
    });
    svg.innerHTML = html;

    // animate draw (stroke-dashoffset)
    const lines = $$(".temp-chart .line", svg);
    lines.forEach(line => {
      const len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      requestAnimationFrame(() => { line.style.transition = "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)"; line.style.strokeDashoffset = 0; });
    });
    requestAnimationFrame(() => $(".temp-chart .area", svg)?.classList.add("show"));
    $("#chartLegend").innerHTML = '<span class="hi">High</span><span class="lo">Low</span>';
  }

  function drawPrecipBars(d) {
    const wrap = $("#precipBars");
    wrap.innerHTML = "";
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    d.daily.precipitation_sum.forEach((mm, i) => {
      const pct = Math.min(mm * 20, 100); // scale: 5mm = full
      const col = el("div", "precip-col");
      const bar = el("div", "precip-bar");
      bar.setAttribute("data-val", fmt(mm, 1) + "mm");
      col.appendChild(bar);
      col.appendChild(el("div", "precip-label", days[new Date(d.daily.time[i]).getDay()]));
      wrap.appendChild(col);
      setTimeout(() => { bar.style.height = Math.max(pct, 4) + "%"; }, 60 + i * 90);
    });
  }

  function renderDayList(d) {
    const wrap = $("#dayList");
    wrap.innerHTML = "";
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const today = new Date().toDateString();
    d.daily.time.forEach((dayStr, i) => {
      const dt = new Date(dayStr);
      const isToday = dt.toDateString() === today;
      const row = el("div", "day-row" + (isToday ? " open" : ""));
      const head = el("button", "day-head");
      head.type = "button"; head.setAttribute("aria-expanded", isToday ? "true" : "false");
      const icWrap = el("div", "day-ic");
      icWrap.appendChild(weatherIcon(d.daily.weather_code[i], 38));
      head.appendChild(icWrap);
      head.appendChild(el("div", "day-name",
        `<span>${isToday ? "Today" : days[dt.getDay()]}</span><small>${dt.toLocaleDateString([], { month: "short", day: "numeric" })}</small>`));
      head.appendChild(el("div", "day-temps",
        `<span class="day-high">${fmt(conv.temp(d.daily.temperature_2m_max[i]),0)}°</span><span class="day-low">${fmt(conv.temp(d.daily.temperature_2m_min[i]),0)}°</span>`));
      head.appendChild(el("div", "day-pop", fmt(d.daily.precipitation_sum[i], 1) + "mm"));
      head.insertAdjacentHTML("beforeend",
        '<svg class="day-chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      row.appendChild(head);

      const detail = el("div", "day-detail");
      const hourly = el("div", "day-hourly");
      // find hourly indices for this day
      const dayPrefix = dayStr.slice(0, 10);
      const idxs = d.hourly.time.map((t, k) => t.slice(0, 10) === dayPrefix ? k : -1).filter(k => k >= 0);
      idxs.forEach((k, n) => {
        if (n % 2 !== 0 && n !== idxs.length - 1) return; // every 2h
        const t = new Date(d.hourly.time[k]);
        const item = el("div", "hour-item");
        item.appendChild(el("div", "hour-time", t.getHours() + "h"));
        const ic = el("div", "hour-ic");
        ic.appendChild(weatherIcon(d.hourly.weather_code[k], 28));
        item.appendChild(ic);
        item.appendChild(el("div", "hour-temp", fmt(conv.temp(d.hourly.temperature_2m[k]),0) + "°"));
        hourly.appendChild(item);
      });
      detail.appendChild(hourly);
      row.appendChild(detail);

      head.addEventListener("click", () => {
        const open = row.classList.toggle("open");
        head.setAttribute("aria-expanded", open ? "true" : "false");
      });
      wrap.appendChild(row);
    });
  }

  /* ---------------- Render MAPS / saved cities ---------------- */
  function renderSaved() {
    const grid = $("#cityGrid");
    grid.innerHTML = "";
    const list = store.saved;
    $("#savedCount").textContent = list.length ? `${list.length} saved ${list.length === 1 ? "city" : "cities"}` : "No saved cities yet.";

    list.forEach((c, i) => {
      const card = el("button", "city-card");
      card.setAttribute("aria-label", `View weather for ${c.name}`);
      card.innerHTML = `
        <button class="city-remove" aria-label="Remove ${c.name}">&times;</button>
        <div class="city-name">${escapeHtml(c.name)}</div>
        <div class="city-sub">${escapeHtml(c.country || "")}</div>`;
      card.appendChild(el("div", "city-temp", '<span class="count-up">—</span>'));
      card.appendChild(el("div", "city-cond", "…"));

      card.querySelector(".city-remove").addEventListener("click", (e) => {
        e.stopPropagation();
        store.saved.splice(i, 1);
        save("aurora.saved", store.saved);
        toast(`${c.name} removed.`);
        renderSaved();
      });
      card.addEventListener("click", () => {
        selectCity({ ...c });
      });
      grid.appendChild(card);

      // fetch live mini-temp
      getForecast(c.lat, c.lon).then(d => {
        const temp = conv.temp(d.current.temperature_2m);
        const w = wmo(d.current.weather_code);
        const tempEl = card.querySelector(".city-temp");
        const cu = tempEl.querySelector(".count-up");
        if (cu) countUp(cu, temp, { sym: "°" });
        else tempEl.textContent = fmt(temp, 0) + "°";
        card.querySelector(".city-cond").textContent = w.t;
        const bg = el("div", "city-bg");
        bg.appendChild(weatherIcon(d.current.weather_code, 90));
        card.insertBefore(bg, card.firstChild);
      }).catch(() => {
        card.querySelector(".city-temp").textContent = "—";
        card.querySelector(".city-cond").textContent = "Unavailable";
      });
    });

    const addCard = el("button", "city-card city-add-card", '<span class="plus">＋</span>Add a city');
    addCard.addEventListener("click", () => {
      $("#searchInput").focus();
      toast("Search a city above, then save it from Home.");
    });
    grid.appendChild(addCard);
  }

  $("#addCityBtn").addEventListener("click", () => {
    if (currentRoute() !== "/maps") { location.hash = "#/maps"; }
    setTimeout(() => $("#searchInput").focus(), 300);
    // Also try saving current city
    if (store.current && !store.saved.some(s => s.name === store.current.name && s.lat === store.current.lat)) {
      store.saved.push(store.current);
      save("aurora.saved", store.saved);
      toast(`${store.current.name} saved to your cities.`);
      renderSaved();
    }
  });

  /* ---------------- Settings ---------------- */
  function renderSettings() {
    applySegState("tempUnit", store.settings.temp);
    applySegState("windUnit", store.settings.wind);
    applySegState("pressUnit", store.settings.press);
    applySegState("themePick", store.settings.theme);
  }
  function applySegState(id, val) {
    $$(`#${id} .seg`).forEach(b => {
      const on = b.dataset.val === val;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
  }
  function bindSegmented(id, key, after) {
    $$(`#${id} .seg`).forEach(btn => {
      btn.addEventListener("click", () => {
        store.settings[key] = btn.dataset.val;
        save("aurora.settings", store.settings);
        applySegState(id, btn.dataset.val);
        if (after) after();
        if (key === "theme") applyUserTheme();
      });
    });
  }
  bindSegmented("tempUnit", "temp", () => { if (store.data) renderHome(); });
  bindSegmented("windUnit", "wind", () => { if (store.data) renderHome(); });
  bindSegmented("pressUnit", "press", () => { if (store.data) renderHome(); });
  bindSegmented("themePick", "theme");

  $("#clearCities").addEventListener("click", () => {
    store.saved = [];
    save("aurora.saved", store.saved);
    toast("Saved cities cleared.");
    renderSaved();
  });

  /* ---------------- Init ---------------- */
  function init() {
    applyUserTheme();
    attachRipple();
    resizeCanvas();
    drawParticles();
    window.addEventListener("resize", () => { resizeCanvas(); moveNavIndicator(currentRoute()); });
    window.addEventListener("hashchange", router);
    router();
    // initial nav indicator position
    requestAnimationFrame(() => moveNavIndicator(currentRoute()));
    // load weather for last current city
    loadWeather(store.current);
  }

  // boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
