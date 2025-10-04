const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const searchInput = $('#search-input');
const suggestionsEl = $('#suggestions');
const currentEl = $('#current');
const forecastEl = $('#forecast');
const favoritesEl = $('#favorites');
const locateBtn = $('#btn-locate');
const slideshowContainer = $('#slideshow-container');
const prevSlideBtn = $('#prev-slide');
const nextSlideBtn = $('#next-slide');
// simple dark mode
let isDark = false;

// Slideshow functionality
let currentSlideIndex = 0;
const weatherImages = [
  {
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    title: 'Kigali Cityscape',
    description: 'Beautiful view of Rwanda\'s capital city'
  },
  {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    title: 'Rwandan Highlands',
    description: 'Misty hills and valleys of Rwanda'
  },
  {
    url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    title: 'Lake Kivu',
    description: 'Serene waters of Lake Kivu in western Rwanda'
  },
  {
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    title: 'Volcanoes National Park',
    description: 'Mountain gorillas habitat in northern Rwanda'
  },
  {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    title: 'Nyungwe Forest',
    description: 'Ancient rainforest in southern Rwanda'
  },
  {
    url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    title: 'Akagera National Park',
    description: 'Wildlife and savanna in eastern Rwanda'
  }
];

const FAVORITES_KEY = 'weather:favorites';

// Slideshow functions
function renderSlide(index) {
  const image = weatherImages[index];
  slideshowContainer.innerHTML = `
    <div class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out" 
         style="background-image: url('${image.url}')">
    </div>
    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
  `;
}

function nextSlide() {
  currentSlideIndex = (currentSlideIndex + 1) % weatherImages.length;
  renderSlide(currentSlideIndex);
}

function prevSlide() {
  currentSlideIndex = (currentSlideIndex - 1 + weatherImages.length) % weatherImages.length;
  renderSlide(currentSlideIndex);
}

function initSlideshow() {
  renderSlide(0);
  
  // Auto-advance slideshow every 3 seconds
  setInterval(nextSlide, 3000);
  
  // Add event listeners for navigation buttons
  nextSlideBtn?.addEventListener('click', nextSlide);
  prevSlideBtn?.addEventListener('click', prevSlide);
}

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
  
  places.forEach((p, index) => {
    const li = document.createElement('li');
    li.className = 'px-3 py-2 hover:bg-gray-50 cursor-pointer transition border-b border-gray-100 last:border-b-0';
    li.style.animationDelay = `${index * 0.1}s`;
    li.style.opacity = '0';
    li.style.transform = 'translateY(-10px)';
    
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
  
  // Show loading state
  suggestionsEl.innerHTML = '<li class="px-3 py-2 text-gray-500 text-center">Searching...</li>';
  suggestionsEl.classList.remove('hidden');
  
  try {
    const places = await geocode(q);
    renderSuggestions(places);
  } catch (e) {
    console.error('Search error:', e);
    suggestionsEl.innerHTML = '<li class="px-3 py-2 text-red-500 text-center">Search failed. Please try again.</li>';
  }
}, 300);

searchInput?.addEventListener('input', handleSearch);

// Add keyboard navigation for search
searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const firstSuggestion = suggestionsEl.querySelector('li');
    if (firstSuggestion) {
      firstSuggestion.click();
    }
  }
});

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
  // Natural weather emojis for Rwanda
  if ([0].includes(code)) return '☀️'; // Clear sky
  if ([1, 2, 3].includes(code)) return '⛅'; // Partly cloudy
  if ([45, 48].includes(code)) return '🌫️'; // Fog
  if ([51, 53, 55].includes(code)) return '🌦️'; // Drizzle
  if ([61, 63, 65].includes(code)) return '🌧️'; // Rain
  if ([71, 73, 75].includes(code)) return '❄️'; // Snow
  if ([77].includes(code)) return '🌨️'; // Snow grains
  if ([80, 81, 82].includes(code)) return '🌦️'; // Rain showers
  if ([85, 86].includes(code)) return '🌨️'; // Snow showers
  if ([95, 96, 99].includes(code)) return '⛈️'; // Thunderstorm
  return '🌤️'; // Default
}

function renderCurrent(name, data) {
  const c = data.current;
  const addToFavoritesBtn = `<button onclick="addFavorite({name: '${name}', latitude: ${data.latitude || 0}, longitude: ${data.longitude || 0}})" class="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition">⭐ Add to Favorites</button>`;
  
  currentEl.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <div class="text-xl font-medium text-gray-900 dark:text-white mb-1">${name || 'Selected location'}</div>
        <div class="text-gray-500 dark:text-gray-300 text-sm">${new Date(c.time).toLocaleString()}</div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-5xl weather-icon">${codeToEmoji(c.weather_code)}</div>
        ${name !== 'Kigali, Rwanda' ? addToFavoritesBtn : ''}
      </div>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-md border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 hover:shadow-md transition-shadow">
        <div class="text-blue-600 dark:text-blue-400 text-xs mb-1 font-medium">Temperature</div>
        <div class="text-2xl font-bold text-gray-900 dark:text-white">${c.temperature_2m}°C</div>
      </div>
      <div class="rounded-md border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 hover:shadow-md transition-shadow">
        <div class="text-green-600 dark:text-green-400 text-xs mb-1 font-medium">Feels like</div>
        <div class="text-2xl font-bold text-gray-900 dark:text-white">${c.apparent_temperature}°C</div>
      </div>
      <div class="rounded-md border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 hover:shadow-md transition-shadow">
        <div class="text-purple-600 dark:text-purple-400 text-xs mb-1 font-medium">Humidity</div>
        <div class="text-2xl font-bold text-gray-900 dark:text-white">${c.relative_humidity_2m}%</div>
      </div>
      <div class="rounded-md border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 hover:shadow-md transition-shadow">
        <div class="text-orange-600 dark:text-orange-400 text-xs mb-1 font-medium">Wind</div>
        <div class="text-2xl font-bold text-gray-900 dark:text-white">${c.wind_speed_10m} km/h</div>
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
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">5-Day Forecast</h2>
      <div class="text-sm text-gray-500 dark:text-gray-300">Updated ${new Date().toLocaleTimeString()}</div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      ${days
        .slice(0, 5)
        .map(
          (x, index) => `
        <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-600 text-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 hover:shadow-md transition-all duration-300 hover:scale-105">
          <div class="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">${new Date(x.time).toLocaleDateString(undefined, { weekday: 'short' })}</div>
          <div class="text-4xl weather-icon mb-2">${codeToEmoji(x.code)}</div>
          <div class="text-lg font-bold text-gray-900 dark:text-white mb-1">${Math.round(x.tmax)}°</div>
          <div class="text-sm text-gray-600 dark:text-gray-300 mb-2">${Math.round(x.tmin)}°</div>
          <div class="text-xs text-blue-600 dark:text-blue-400 font-medium">${x.pop ?? 0}% chance of rain</div>
        </div>`
        )
        .join('')}
    </div>
  `;
}

async function loadWeather(lat, lon, name) {
  currentEl.innerHTML = `
    <div class="flex items-center justify-center py-8">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div class="text-gray-500">Loading weather data...</div>
      </div>
    </div>
  `;
  forecastEl.innerHTML = '';
  
  try {
    const data = await fetchWeather(lat, lon);
    renderCurrent(name, data);
    renderForecast(data);
  } catch (e) {
    console.error('Weather loading error:', e);
    currentEl.innerHTML = `
      <div class="text-center py-8">
        <div class="text-red-500 text-4xl mb-4">⚠️</div>
        <div class="text-red-600 font-medium mb-2">Failed to load weather data</div>
        <div class="text-gray-500 text-sm">Please check your internet connection and try again</div>
        <button onclick="loadWeather(${lat}, ${lon}, '${name}')" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Try Again
        </button>
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
  // Initialize slideshow
  initSlideshow();
  
  // Kigali approx coordinates
  loadWeather(-1.95, 30.06, 'Kigali, Rwanda');
});

