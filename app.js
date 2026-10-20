// Weather Checker — by Sudais Alam
// Uses the Open-Meteo API (free, no API key required)
//   Geocoding:  https://geocoding-api.open-meteo.com/v1/search?name=...
//   Forecast:   https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..

const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const suggestionsBox = document.getElementById('suggestions');
const card = document.getElementById('weather-card');
const errorBox = document.getElementById('error');
const loader = document.getElementById('loader');

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const WEATHER_CODES = {
  0:  { label: 'Clear sky',          icon: '☀️', cls: 'clear'  },
  1:  { label: 'Mainly clear',       icon: '🌤️', cls: 'clear'  },
  2:  { label: 'Partly cloudy',      icon: '⛅',  cls: 'cloudy' },
  3:  { label: 'Overcast',            icon: '☁️',  cls: 'cloudy' },
  45: { label: 'Foggy',               icon: '🌫️', cls: 'cloudy' },
  48: { label: 'Rime fog',            icon: '🌫️', cls: 'cloudy' },
  51: { label: 'Light drizzle',       icon: '🌦️', cls: 'rainy'  },
  53: { label: 'Drizzle',             icon: '🌦️', cls: 'rainy'  },
  55: { label: 'Heavy drizzle',       icon: '🌧️', cls: 'rainy'  },
  61: { label: 'Light rain',          icon: '🌦️', cls: 'rainy'  },
  63: { label: 'Rain',                icon: '🌧️', cls: 'rainy'  },
  65: { label: 'Heavy rain',          icon: '🌧️', cls: 'rainy'  },
  71: { label: 'Light snow',          icon: '🌨️', cls: 'snowy'  },
  73: { label: 'Snow',                icon: '❄️',  cls: 'snowy'  },
  75: { label: 'Heavy snow',          icon: '❄️',  cls: 'snowy'  },
  77: { label: 'Snow grains',         icon: '🌨️', cls: 'snowy'  },
  80: { label: 'Rain showers',        icon: '🌦️', cls: 'rainy'  },
  81: { label: 'Heavy showers',       icon: '🌧️', cls: 'rainy'  },
  82: { label: 'Violent showers',     icon: '⛈️',  cls: 'rainy'  },
  85: { label: 'Snow showers',        icon: '🌨️', cls: 'snowy'  },
  86: { label: 'Heavy snow showers',  icon: '❄️',  cls: 'snowy'  },
  95: { label: 'Thunderstorm',        icon: '⛈️',  cls: 'rainy'  },
  96: { label: 'Storm with hail',     icon: '⛈️',  cls: 'rainy'  },
  99: { label: 'Severe storm',        icon: '⛈️',  cls: 'rainy'  },
};

function describe(code) {
  return WEATHER_CODES[code] || { label: 'Unknown', icon: '🌡️', cls: 'cloudy' };
}

function show(el)   { el.classList.remove('hidden'); }
function hide(el)   { el.classList.add('hidden'); }
function resetUI()  { hide(card); hide(errorBox); hide(loader); hide(suggestionsBox); }

async function searchCities(name) {
  const url = `${GEO_URL}?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  return data.results || [];
}

async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    current:   'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure',
    daily:     'weather_code,temperature_2m_max,temperature_2m_min',
    timezone:  'auto',
    forecast_days: '5',
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error('Weather request failed');
  return res.json();
}

function renderWeather(city, weather) {
  const cur = weather.current;
  const info = describe(cur.weather_code);

  document.getElementById('city-name').textContent = city.name;
  document.getElementById('country').textContent = [city.admin1, city.country].filter(Boolean).join(', ');
  document.getElementById('temperature').textContent = Math.round(cur.temperature_2m);
  document.getElementById('description').textContent = info.label;
  document.getElementById('weather-icon').textContent = info.icon;
  document.getElementById('feels-like').textContent = Math.round(cur.apparent_temperature) + '°C';
  document.getElementById('humidity').textContent = cur.relative_humidity_2m + '%';
  document.getElementById('wind').textContent = Math.round(cur.wind_speed_10m) + ' km/h';
  document.getElementById('pressure').textContent = Math.round(cur.surface_pressure) + ' hPa';

  // 5-day forecast
  const forecastEl = document.getElementById('forecast');
  forecastEl.innerHTML = '';
  const days = weather.daily.time;
  const today = new Date().toISOString().slice(0, 10);
  days.slice(0, 5).forEach((day, i) => {
    const dInfo = describe(weather.daily.weather_code[i]);
    const dayLabel = (day === today) ? 'Today' : new Date(day).toLocaleDateString('en', { weekday: 'short' });
    const el = document.createElement('div');
    el.className = 'forecast-day';
    el.innerHTML = `
      <span class="day">${dayLabel}</span>
      <span class="f-icon">${dInfo.icon}</span>
      <span class="f-temp">${Math.round(weather.daily.temperature_2m_max[i])}°</span>
      <span class="f-low">${Math.round(weather.daily.temperature_2m_min[i])}°</span>
    `;
    forecastEl.appendChild(el);
  });

  // Set background based on weather
  document.body.className = '';
  document.body.classList.add(info.cls);

  // Night mode if after sunset (simple check: hours 19-6)
  const hour = new Date().getHours();
  if (hour >= 19 || hour < 6) document.body.classList.add('night');

  hide(errorBox);
  show(card);
}

function showError(msg) {
  errorBox.textContent = msg;
  show(errorBox);
  hide(card);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = cityInput.value.trim();
  if (!name) return;
  resetUI();
  show(loader);
  try {
    const cities = await searchCities(name);
    if (!cities.length) {
      hide(loader);
      showError(`No city found for "${name}". Try another name.`);
      return;
    }
    // If multiple matches, pick the first (most populous) — could show picker
    const city = cities[0];
    const weather = await getWeather(city.latitude, city.longitude);
    hide(loader);
    renderWeather(city, weather);
  } catch (err) {
    hide(loader);
    showError('Could not fetch weather. Check your internet connection and try again.');
    console.error(err);
  }
});

// Live city suggestions as you type
let debounceTimer;
cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = cityInput.value.trim();
  if (q.length < 2) { hide(suggestionsBox); return; }
  debounceTimer = setTimeout(async () => {
    try {
      const cities = await searchCities(q);
      if (!cities.length) { hide(suggestionsBox); return; }
      suggestionsBox.innerHTML = '';
      cities.forEach(c => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `${c.name}<span class="country">${[c.admin1, c.country].filter(Boolean).join(', ')}</span>`;
        item.addEventListener('click', async () => {
          cityInput.value = c.name;
          hide(suggestionsBox);
          resetUI(); show(loader);
          try {
            const weather = await getWeather(c.latitude, c.longitude);
            hide(loader);
            renderWeather(c, weather);
          } catch {
            hide(loader);
            showError('Could not fetch weather for ' + c.name);
          }
        });
        suggestionsBox.appendChild(item);
      });
      show(suggestionsBox);
    } catch { hide(suggestionsBox); }
  }, 350);
});

// Click outside to close suggestions
document.addEventListener('click', (e) => {
  if (!form.contains(e.target)) hide(suggestionsBox);
});

// Load a default city on start
window.addEventListener('load', () => {
  cityInput.value = 'Delhi';
  form.dispatchEvent(new Event('submit'));
});
