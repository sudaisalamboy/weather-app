# Weather Checker

A clean, responsive weather app built with pure **HTML, CSS, and JavaScript** — no frameworks, no build step, no API key required.

> **Made with ♥ by Sudais Alam**

---

## Features

- **Live weather** for any city in the world
- **5-day forecast** with daily high/low temperatures
- **Live city suggestions** as you type (debounced autocomplete)
- **Dynamic backgrounds** that match the current weather (clear / cloudy / rainy / snowy / night)
- **Full details**: temperature, feels-like, humidity, wind speed, pressure
- **No API key needed** — uses the free [Open-Meteo](https://open-meteo.com) API
- **Fully responsive** — works on phone, tablet, and desktop
- **Zero dependencies** — just open the HTML file

---

## Demo

```
┌─────────────────────────────────────┐
│        Weather Checker              │
│  Real-time weather for any city     │
│                                     │
│  ┌─────────────────────┐ ┌───────┐ │
│  │ Search a city…      │ │Search │ │
│  └─────────────────────┘ └───────┘ │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Delhi            23°C            ││
│  │ Delhi, India                    ││
│  │ ☀️ Clear sky                    ││
│  │ Feels like 25°C · Humidity 76% ││
│  │ Wind 4 km/h · Pressure 988 hPa ││
│  │ ┌──┬──┬──┬──┬──┐               ││
│  │ │To│Fr│Sa│Su│Mo│  ← 5-day     ││
│  │ └──┴──┴──┴──┴──┘               ││
│  └─────────────────────────────────┘│
│  Weather data by Open-Meteo         │
│  Made with ♥ by Sudais Alam        │
└─────────────────────────────────────┘
```

---

## Quick Start

### Option 1 — Open directly

Just double-click `index.html` to open it in your browser. That's it.

### Option 2 — Run a local server (recommended)

```bash
# Python 3
python3 -m http.server 8000

# or Node.js
npx serve

# or PHP
php -S localhost:8000
```

Then open <http://localhost:8000> in your browser.

---

## How It Works

1. **Geocoding** — When you type a city name, the app calls `https://geocoding-api.open-meteo.com/v1/search` to get the latitude/longitude (and shows live suggestions).
2. **Forecast** — With the coordinates, it calls `https://api.open-meteo.com/v1/forecast` to get the current weather + 5-day forecast.
3. **Render** — The UI updates with the temperature, conditions, and a 5-day strip. The background gradient changes based on the weather code.

All requests happen client-side in the browser — no server, no backend, no API key.

---

## File Structure

```
weather-app/
├── index.html    # Markup + structure
├── style.css     # Styling (glassmorphism, responsive, dynamic backgrounds)
├── app.js        # Logic (API calls, rendering, autocomplete)
├── README.md     # This file
└── SETUP.md      # Detailed setup instructions
```

---

## Weather Codes

The app maps Open-Meteo's WMO weather codes to icons and labels:

| Code | Condition | Icon |
|------|-----------|------|
| 0 | Clear sky | ☀️ |
| 1-3 | Mainly clear / Partly cloudy / Overcast | 🌤️ ⛅ ☁️ |
| 45, 48 | Fog / Rime fog | 🌫️ |
| 51-55 | Drizzle (light / moderate / dense) | 🌦️ 🌧️ |
| 61-65 | Rain (light / moderate / heavy) | 🌦️ 🌧️ |
| 71-77 | Snow fall | 🌨️ ❄️ |
| 80-82 | Rain showers | 🌦️ 🌧️ ⛈️ |
| 85-86 | Snow showers | 🌨️ ❄️ |
| 95-99 | Thunderstorm | ⛈️ |

---

## Browser Support

Works in all modern browsers: Chrome, Firefox, Safari, Edge. Requires JavaScript enabled.

---

## Credits

- **Weather data**: [Open-Meteo](https://open-meteo.com) (free, open-source weather API)
- **Font**: [Inter](https://fonts.google.com/specimen/Inter) by Rasmus Andersson
- **Made by**: **Sudais Alam** ([github.com/sudaisalamboy](https://github.com/sudaisalamboy))

---

## License

MIT License — free to use, modify, and distribute.
