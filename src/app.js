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
    favoritesEl.innerHTML = `
      <li class="text-white/70 text-center py-8">
        <div class="text-4xl mb-3">🌟</div>
        <p class="font-light">No favorites yet</p>
        <p class="text-sm text-white/50 mt-1">Save cities you love</p>
      </li>
    `;
    return;
  }
  
  favs.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'glass-card rounded-xl p-4 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 group slide-in';
    li.style.animationDelay = `${i * 0.1}s`;
    
    const btn = document.createElement('button');
    btn.className = 'text-left w-full group-hover:text-white/90 transition-colors duration-300';
    btn.onclick = () => loadWeather(f.latitude, f.longitude, f.name);
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'text-white font-semibold text-sm truncate mb-1';
    nameDiv.textContent = f.name;
    
    const coordsDiv = document.createElement('div');
    coordsDiv.className = 'text-white/60 text-xs';
    coordsDiv.textContent = `${f.latitude.toFixed(2)}, ${f.longitude.toFixed(2)}`;
    
    btn.appendChild(nameDiv);
    btn.appendChild(coordsDiv);
    
    const rm = document.createElement('button');
    rm.className = 'mt-3 px-3 py-1 bg-red-500/20 backdrop-blur-sm text-red-300 text-xs rounded-lg hover:bg-red-500/30 transition-all duration-300 border border-red-400/30';
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
  suggestionsEl.classList.add('slide-in');
  
  places.forEach((p, index) => {
    const li = document.createElement('li');
    li.className = 'px-6 py-4 hover:bg-white/10 cursor-pointer transition-all duration-300 border-b border-white/10 last:border-b-0 group';
    li.style.animationDelay = `${index * 0.1}s`;
    li.style.opacity = '0';
    li.style.transform = 'translateY(10px)';
    
    const name = `${p.name}${p.admin1 ? ', ' + p.admin1 : ''}${p.country ? ', ' + p.country : ''}`;
    
    const content = document.createElement('div');
    content.className = 'flex items-center justify-between';
    
    const left = document.createElement('div');
    left.className = 'flex-1 min-w-0';
    
    const nameSpan = document.createElement('div');
    nameSpan.className = 'text-white font-semibold text-lg truncate group-hover:text-white/90 transition-colors duration-300';
    nameSpan.textContent = name;
    
    const coordsSpan = document.createElement('div');
    coordsSpan.className = 'text-white/60 text-sm mt-1';
    coordsSpan.textContent = `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`;
    
    left.appendChild(nameSpan);
    left.appendChild(coordsSpan);
    
    const addBtn = document.createElement('button');
    addBtn.className = 'px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-xl hover:bg-white/30 transition-all duration-300 flex-shrink-0 ml-4 transform hover:scale-105 border border-white/20';
    addBtn.textContent = '⭐ Save';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      addFavorite({ name, latitude: p.latitude, longitude: p.longitude });
      addBtn.textContent = '✓ Saved';
      addBtn.className = 'px-4 py-2 bg-green-500/30 backdrop-blur-sm text-white text-sm rounded-xl flex-shrink-0 ml-4 border border-green-400/50';
      setTimeout(() => {
        addBtn.textContent = '⭐ Save';
        addBtn.className = 'px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-xl hover:bg-white/30 transition-all duration-300 flex-shrink-0 ml-4 transform hover:scale-105 border border-white/20';
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
    <div class="flex items-center justify-between mb-12 slide-in">
      <div>
        <div class="text-4xl font-bold text-white mb-3 gradient-text">${name || 'Selected location'}</div>
        <div class="text-white/80 text-lg font-light">${new Date(c.time).toLocaleString()}</div>
      </div>
      <div class="text-9xl weather-icon floating-animation">${codeToEmoji(c.weather_code)}</div>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="glass-card rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 group">
        <div class="text-white/70 text-sm mb-3 font-medium">Temperature</div>
        <div class="text-4xl font-bold text-white group-hover:text-white/90 transition-colors duration-300">${c.temperature_2m}°C</div>
        <div class="text-white/50 text-xs mt-2">Current</div>
      </div>
      <div class="glass-card rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 group">
        <div class="text-white/70 text-sm mb-3 font-medium">Feels like</div>
        <div class="text-4xl font-bold text-white group-hover:text-white/90 transition-colors duration-300">${c.apparent_temperature}°C</div>
        <div class="text-white/50 text-xs mt-2">Perceived</div>
      </div>
      <div class="glass-card rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 group">
        <div class="text-white/70 text-sm mb-3 font-medium">Humidity</div>
        <div class="text-4xl font-bold text-white group-hover:text-white/90 transition-colors duration-300">${c.relative_humidity_2m}%</div>
        <div class="text-white/50 text-xs mt-2">Moisture</div>
      </div>
      <div class="glass-card rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 group">
        <div class="text-white/70 text-sm mb-3 font-medium">Wind</div>
        <div class="text-4xl font-bold text-white group-hover:text-white/90 transition-colors duration-300">${c.wind_speed_10m} km/h</div>
        <div class="text-white/50 text-xs mt-2">Speed</div>
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
    <div class="flex items-center justify-between mb-8 slide-in">
      <h2 class="text-3xl font-bold text-white gradient-text">5-Day Forecast</h2>
      <div class="text-white/60 text-sm">Detailed outlook</div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      ${days
        .slice(0, 5)
        .map(
          (x, index) => `
        <div class="glass-card rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 transform hover:scale-105 group slide-in" style="animation-delay: ${index * 0.1}s">
          <div class="text-white/70 text-sm mb-3 font-medium">${new Date(x.time).toLocaleDateString(undefined, { weekday: 'short' })}</div>
          <div class="text-5xl mb-4 weather-icon group-hover:scale-110 transition-transform duration-300">${codeToEmoji(x.code)}</div>
          <div class="text-white font-bold text-lg mb-2">${Math.round(x.tmin)}° / ${Math.round(x.tmax)}°</div>
          <div class="text-white/60 text-sm">${x.pop ?? 0}% chance</div>
          <div class="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full" style="width: ${x.pop ?? 0}%"></div>
          </div>
        </div>`
        )
        .join('')}
    </div>
  `;
}

async function loadWeather(lat, lon, name) {
  currentEl.innerHTML = `
    <div class="text-center py-16">
      <div class="text-8xl mb-6 pulse-animation">🌪️</div>
      <div class="text-white/80 text-2xl font-light mb-2">Loading weather data...</div>
      <div class="text-white/60">Fetching the latest forecast</div>
    </div>
  `;
  forecastEl.innerHTML = '';
  try {
    const data = await fetchWeather(lat, lon);
    renderCurrent(name, data);
    renderForecast(data);
  } catch (e) {
    console.error(e);
    currentEl.innerHTML = `
      <div class="text-center py-16">
        <div class="text-8xl mb-6">❌</div>
        <div class="text-red-300 text-2xl font-light mb-2">Failed to load weather data</div>
        <div class="text-white/60">Please check your connection and try again</div>
      </div>
    `;
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

