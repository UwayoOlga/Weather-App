const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const searchInput = $('#search-input');
const suggestionsEl = $('#suggestions');
const currentEl = $('#current');
const forecastEl = $('#forecast');
const favoritesEl = $('#favorites');
const locateBtn = $('#btn-locate');
// simple dark mode
let isDark = false;

const FAVORITES_KEY = 'weather:favorites';

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function readFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

function renderFavorites() {
  const favs = readFavorites();
  favoritesEl.innerHTML = '';
  
  if (favs.length === 0) {
    favoritesEl.innerHTML = `<li class="text-gray-500 text-sm text-center py-2">No favorites yet</li>`;
    return;
  }
  
  favs.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50 transition';
    li.style.animationDelay = `${i * 0.1}s`;
    
    const btn = document.createElement('button');
    btn.className = 'text-left w-full';
    btn.onclick = () => loadWeather(f.latitude, f.longitude, f.name);
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'text-gray-900 font-medium text-sm truncate mb-1';
    nameDiv.textContent = f.name;
    
    const coordsDiv = document.createElement('div');
    coordsDiv.className = 'text-gray-500 text-xs';
    coordsDiv.textContent = `${f.latitude.toFixed(2)}, ${f.longitude.toFixed(2)}`;
    
    btn.appendChild(nameDiv);
    btn.appendChild(coordsDiv);
    
    const rm = document.createElement('button');
    rm.className = 'mt-2 px-3 py-1 bg-red-50 text-red-700 text-xs rounded-md hover:bg-red-100 transition border border-red-200';
    rm.textContent = '🗑️ Remove';
    rm.onclick = (e) => {
      e.stopPropagation();
      const updated = favs.filter((_, idx) => idx !== i);
      writeFavorites(updated);
      renderFavorites();
    };
    
    li.appendChild(btn);
    li.appendChild(rm);
    favoritesEl.appendChild(li);
  });
}

function addFavorite(place) {
  const favs = readFavorites();
  if (!favs.find((f) => f.name === place.name && f.latitude === place.latitude && f.longitude === place.longitude)) {
    favs.push(place);
    writeFavorites(favs);
    renderFavorites();
  }
}

async function geocode(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  return data.results || [];
}

function renderSuggestions(places) {
  suggestionsEl.innerHTML = '';
  if (!places.length) {
    suggestionsEl.classList.add('hidden');
    return;
  }
  suggestionsEl.classList.remove('hidden');
  suggestionsEl.classList.add('');
  
  places.forEach((p, index) => {
    const li = document.createElement('li');
    li.className = 'px-3 py-2 hover:bg-gray-50 cursor-pointer transition border-b border-gray-100 last:border-b-0';
    li.style.animationDelay = `${index * 0.1}s`;
    li.style.opacity = '1';
    li.style.transform = 'translateY(0)';
    
    const name = `${p.name}${p.admin1 ? ', ' + p.admin1 : ''}${p.country ? ', ' + p.country : ''}`;
    
    const content = document.createElement('div');
    content.className = 'flex items-center justify-between';
    
    const left = document.createElement('div');
    left.className = 'flex-1 min-w-0';
    
    const nameSpan = document.createElement('div');
    nameSpan.className = 'text-gray-900 font-medium truncate';
    nameSpan.textContent = name;
    
    const coordsSpan = document.createElement('div');
    coordsSpan.className = 'text-gray-500 text-sm mt-1';
    coordsSpan.textContent = `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`;
    
    left.appendChild(nameSpan);
    left.appendChild(coordsSpan);
    
    const addBtn = document.createElement('button');
    addBtn.className = 'px-3 py-1 bg-gray-900 text-white text-xs rounded-md hover:bg-black transition flex-shrink-0 ml-3';
    addBtn.textContent = 'Save';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      addFavorite({ name, latitude: p.latitude, longitude: p.longitude });
      addBtn.textContent = '✓ Saved';
      addBtn.className = 'px-3 py-1 bg-green-600 text-white text-xs rounded-md flex-shrink-0 ml-3';
      setTimeout(() => {
        addBtn.textContent = 'Save';
        addBtn.className = 'px-3 py-1 bg-gray-900 text-white text-xs rounded-md hover:bg-black transition flex-shrink-0 ml-3';
      }, 2000);
    };
    
    content.appendChild(left);
    content.appendChild(addBtn);
    li.appendChild(content);
    
    li.onclick = () => {
      searchInput.value = name;
      suggestionsEl.classList.add('hidden');
      loadWeather(p.latitude, p.longitude, name);
    };
    
    suggestionsEl.appendChild(li);
    
    // Animate in
    setTimeout(() => {
      li.style.opacity = '1';
      li.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

const handleSearch = debounce(async () => {
  const q = searchInput.value.trim();
  if (!q) {
    suggestionsEl.classList.add('hidden');
    return;
  }
  try {
    const places = await geocode(q);
    renderSuggestions(places);
  } catch (e) {
    console.error(e);
  }
}, 300);

searchInput?.addEventListener('input', handleSearch);
document.addEventListener('click', (e) => {
  if (!suggestionsEl.contains(e.target) && e.target !== searchInput) {
    suggestionsEl.classList.add('hidden');
  }
});

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

function codeToEmoji(code) {
  // Minimal mapping for demo
  if ([0].includes(code)) return '☀️';
  if ([1, 2, 3].includes(code)) return '⛅';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 61, 63, 65].includes(code)) return '🌧️';
  if ([71, 73, 75].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}

function renderCurrent(name, data) {
  const c = data.current;
  currentEl.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <div class="text-xl font-medium text-gray-900 mb-1">${name || 'Selected location'}</div>
        <div class="text-gray-500 text-sm">${new Date(c.time).toLocaleString()}</div>
      </div>
      <div class="text-5xl">${codeToEmoji(c.weather_code)}</div>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-md border border-gray-200 bg-white p-4">
        <div class="text-gray-500 text-xs mb-1">Temperature</div>
        <div class="text-2xl font-semibold text-gray-900">${c.temperature_2m}°C</div>
      </div>
      <div class="rounded-md border border-gray-200 bg-white p-4">
        <div class="text-gray-500 text-xs mb-1">Feels like</div>
        <div class="text-2xl font-semibold text-gray-900">${c.apparent_temperature}°C</div>
      </div>
      <div class="rounded-md border border-gray-200 bg-white p-4">
        <div class="text-gray-500 text-xs mb-1">Humidity</div>
        <div class="text-2xl font-semibold text-gray-900">${c.relative_humidity_2m}%</div>
      </div>
      <div class="rounded-md border border-gray-200 bg-white p-4">
        <div class="text-gray-500 text-xs mb-1">Wind</div>
        <div class="text-2xl font-semibold text-gray-900">${c.wind_speed_10m} km/h</div>
      </div>
    </div>
  `;
}

function renderForecast(data) {
  const d = data.daily;
  const days = d.time.map((t, i) => ({
    time: t,
    code: d.weather_code[i],
    tmax: d.temperature_2m_max[i],
    tmin: d.temperature_2m_min[i],
    pop: d.precipitation_probability_max[i],
  }));
  forecastEl.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-base font-medium text-gray-900">Next days</h2>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
      ${days
        .slice(0, 5)
        .map(
          (x) => `
        <div class="p-3 rounded border text-center bg-white">
          <div class="text-sm text-gray-500">${new Date(x.time).toLocaleDateString(undefined, { weekday: 'short' })}</div>
          <div class="text-3xl">${codeToEmoji(x.code)}</div>
          <div class="mt-1 text-sm text-gray-900">${Math.round(x.tmin)}° / ${Math.round(x.tmax)}°</div>
          <div class="text-xs text-gray-500">POP ${x.pop ?? 0}%</div>
        </div>`
        )
        .join('')}
    </div>
  `;
}

async function loadWeather(lat, lon, name) {
  currentEl.innerHTML = '<div class="text-gray-500">Loading...</div>';
  forecastEl.innerHTML = '';
  try {
    const data = await fetchWeather(lat, lon);
    renderCurrent(name, data);
    renderForecast(data);
  } catch (e) {
    console.error(e);
    currentEl.innerHTML = '<div class="text-red-600">Failed to load weather.</div>';
  }
}

locateBtn?.addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      loadWeather(latitude, longitude, 'My location');
    },
    (err) => {
      console.warn(err);
      alert('Unable to get location');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

renderFavorites();

// Dark mode toggle persisted
const DARK_KEY = 'weather:dark';
function applyTheme() {
  isDark = localStorage.getItem(DARK_KEY) === '1';
  document.documentElement.classList.toggle('dark', isDark);
}
applyTheme();
const header = document.querySelector('header');
if (header) {
  const buttonContainer = header.querySelector('div:last-child');
  if (buttonContainer) {
    const toggle = document.createElement('button');
    toggle.id = 'btn-theme';
    toggle.className = 'group px-6 py-3 glass-card text-white rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 flex items-center gap-3';
    toggle.innerHTML = `<span class="text-xl group-hover:animate-pulse">${isDark ? '☀️' : '🌙'}</span><span class="font-medium">${isDark ? 'Light' : 'Dark'}</span>`;
    toggle.onclick = () => {
      isDark = !isDark;
      localStorage.setItem(DARK_KEY, isDark ? '1' : '0');
      applyTheme();
      toggle.innerHTML = `<span class="text-xl group-hover:animate-pulse">${isDark ? '☀️' : '🌙'}</span><span class="font-medium">${isDark ? 'Light' : 'Dark'}</span>`;
    };
    buttonContainer.appendChild(toggle);
  }
}

// Default: load Kigali, Rwanda on first open
window.addEventListener('DOMContentLoaded', () => {
  // Kigali approx coordinates
  loadWeather(-1.95, 30.06, 'Kigali, Rwanda');
});

