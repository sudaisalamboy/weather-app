# Setup Guide — Weather Checker

Detailed instructions for running, customizing, and deploying the Weather Checker app.

> **Made by Sudais Alam**

---

## Prerequisites

The only requirement is a **web browser** (Chrome, Firefox, Safari, or Edge).

For local development, you'll optionally need one of:
- **Python 3** (for the built-in HTTP server)
- **Node.js** (for `npx serve` or `http-server`)
- **PHP** (for `php -S`)

No API key, no build tools, no package manager required.

---

## 1. Run Locally

### Method A — Open the file directly (simplest)

```bash
# Clone the repo
git clone https://github.com/sudaisalamboy/weather-app.git
cd weather-app

# Just open index.html in your default browser
# macOS:
open index.html
# Linux:
xdg-open index.html
# Windows:
start index.html
```

That's it — the app will load and show weather for Delhi (the default city).

### Method B — Python HTTP server

```bash
cd weather-app
python3 -m http.server 8000
```

Open <http://localhost:8000> in your browser.

### Method C — Node.js

```bash
cd weather-app
npx serve -l 8000
```

Open <http://localhost:8000> in your browser.

### Method D — VS Code Live Server

If you use VS Code, install the "Live Server" extension, right-click `index.html`, and choose **"Open with Live Server"**.

---

## 2. Using the App

1. **Search**: Type a city name in the search box (e.g. "London", "Tokyo", "Delhi"). As you type, live suggestions appear — click one to jump straight to its weather.
2. **View**: The card shows the current temperature, condition, feels-like, humidity, wind, and pressure.
3. **Forecast**: The 5-day strip at the bottom shows the daily high/low with weather icons.
4. **Background**: The page background changes based on the weather — sunny, cloudy, rainy, snowy, or night mode.

---

## 3. Customization

### Change the default city

In `app.js`, find the line near the bottom:

```javascript
cityInput.value = 'Delhi';
```

Change `'Delhi'` to any city you like (e.g. `'London'`, `'New York'`, `'Tokyo'`).

### Change the theme colors

In `style.css`, edit the `:root` variables:

```css
:root {
  --bg-grad-1: #1e3a8a;   /* primary background color */
  --bg-grad-2: #0f172a;   /* secondary background color */
  --accent: #38bdf8;      /* accent color (buttons, highlights) */
  --card-bg: rgba(255, 255, 255, 0.08);  /* card transparency */
}
```

### Change the number of forecast days

In `app.js`, find the `getWeather` function and change `forecast_days: '5'` to any value from 1 to 16:

```javascript
forecast_days: '7',  // show a 7-day forecast
```

---

## 4. Deploy Online (free options)

### GitHub Pages

1. Push the code to GitHub (see below).
2. In your repo, go to **Settings → Pages**.
3. Under **Source**, choose the `main` branch and `/root` folder.
4. Click **Save**. Your app will be live at `https://<username>.github.io/weather-app/` in 1-2 minutes.

### Netlify (drag-and-drop)

1. Go to <https://app.netlify.com/drop>
2. Drag the `weather-app` folder onto the page.
3. You'll get a live URL instantly (e.g. `https://weather-app-xyz.netlify.app`).

### Vercel

```bash
npm i -g vercel
cd weather-app
vercel
```

Follow the prompts — Vercel auto-detects static sites.

### Cloudflare Pages

1. Go to <https://pages.cloudflare.com>
2. Connect your GitHub repo.
3. Build command: *(none)* · Output directory: `.` (root)
4. Deploy.

---

## 5. Run the Tests (manual)

Since this is a pure frontend app with no build step, testing is manual:

1. Open the app in your browser.
2. Verify it loads with Delhi weather (the default).
3. Type "Tokyo" in the search box — suggestions should appear as you type.
4. Press Enter or click Search — the card should update to show Tokyo's weather.
5. Try a non-existent city (e.g. "xyz123") — you should see an error message.
6. Resize the browser window — the layout should adapt responsively.
7. Check the footer — it should say "Made with ♥ by Sudais Alam".

---

## 6. Troubleshooting

### "This site can't be reached" / blank page

- If you opened `index.html` directly via `file://`, some browsers block fetch requests. Use a local server instead (Method B or C above).

### Weather doesn't load / "Could not fetch weather"

- Check your internet connection.
- The Open-Meteo API might be temporarily down — try again in a few minutes.
- If you're behind a corporate firewall, it might block the API. Try on a different network.

### Suggestions don't appear

- Make sure you type at least 2 characters.
- The geocoding API has a rate limit (~5 requests/second). If you type very fast, some requests might be skipped (this is expected — the debounce handles it).

### City not found

- Try the full city name (e.g. "New York" instead of "NYC").
- Try adding the country (e.g. "Paris, France").
- Some small towns might not be in the geocoding database. Try the nearest large city.

---

## 7. API Reference

This app uses two free, no-key APIs:

### Geocoding API

```
GET https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=en&format=json
```

Returns up to 5 matching cities with their latitude, longitude, country, and admin region.

### Forecast API

```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5
```

Returns the current weather + 5-day forecast.

Both APIs are free for non-commercial use. See <https://open-meteo.com/en/docs> for full documentation.

---

## Credits

- **Developer**: Sudais Alam ([github.com/sudaisalamboy](https://github.com/sudaisalamboy))
- **Weather API**: Open-Meteo (free, open-source)
- **Font**: Inter by Rasmus Andersson
- **License**: MIT

---

*Last updated: October 2026*
