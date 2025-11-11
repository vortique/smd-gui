const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");
const html = document.documentElement;

const settingsBtn = document.getElementById("settingsBtn");

settingsBtn.addEventListener("click", () => {
  window.electronAPI.openSettings();
});

// Look for system theme
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// Apply theme
function setTheme(theme) {
  html.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  if (theme === "dark") {
    themeIcon.textContent = "☀️";
    themeText.textContent = "Light Theme";
  } else {
    themeIcon.textContent = "🌙";
    themeText.textContent = "Dark Theme";
  }
}

// Look for saved theme and change to it
const savedTheme = localStorage.getItem("theme") || getSystemTheme();
setTheme(savedTheme);

// Change themes
themeToggle.addEventListener("click", () => {
  const currentTheme = html.getAttribute("data-theme");
  setTheme(currentTheme === "dark" ? "light" : "dark");
});

// Listen system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      setTheme(e.matches ? "dark" : "light");
    }
  });


const downloadBtn = document.getElementById("downloadBtn");
const progressContainer = document.getElementById("progressContainer");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const progressText = document.getElementById("progressText");
const statusMessage = document.getElementById("statusMessage");
const spotifyUrl = document.getElementById("spotifyUrl");

let url = "";

function showStatusWithTimeout(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message active ${type}`;

  setTimeout(() => {
    statusMessage.classList.remove("active");
  }, 5000);
}

function showStatusAndWait(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message active ${type}`;
}

function updateProgress(percent, text = "Downloading...") {
  progressFill.style.width = percent + "%";
  progressPercent.textContent = percent + "%";
  progressText.textContent = text;
}

downloadBtn.addEventListener("click", async () => {
  if (!url || !url.includes("spotify.com")) {
    showStatusWithTimeout("Please enter a Spotify URL!", "error");
    return;
  }

  downloadBtn.disabled = true;
  progressContainer.classList.add("active");
  statusMessage.classList.remove("active");
  updateProgress(0, "Starting...");

  const result = await window.electronAPI.downloadSong(url);

  console.log(result);
})

function openInfoPanel() {
  document.getElementById('infoPanel').classList.add('active');
}

// Close info panel
function closeInfoPanel() {
  document.getElementById('infoPanel').classList.remove('active');
}

// Close button
document.getElementById('closeInfoBtn').addEventListener('click', closeInfoPanel);

// Show track info
function showTrackInfo(data) {
  const content = `
    <img src="${data.image}" class="info-cover" alt="Cover">
    <div class="info-section">
      <span class="info-type">Track</span>
      <h3 class="info-title">${data.name}</h3>
      <p class="info-subtitle">${data.artist}</p>
    </div>
    <div class="info-section">
      <div class="info-detail">
        <span class="info-detail-label">Album</span>
        <span class="info-detail-value">${data.album}</span>
      </div>
      <div class="info-detail">
        <span class="info-detail-label">Duration</span>
        <span class="info-detail-value">${data.duration}</span>
      </div>
      <div class="info-detail">
        <span class="info-detail-label">Release Date</span>
        <span class="info-detail-value">${data.releaseDate}</span>
      </div>
    </div>
  `;
  
  document.getElementById('infoPanelContent').innerHTML = content;
  openInfoPanel();
}

// Show playlist info
function showPlaylistInfo(data) {
  const tracksHtml = data.tracks.map((track, i) => `
    <div class="info-track-item">
      <span class="info-track-number">${i + 1}</span>
      <div class="info-track-details">
        <div class="info-track-name">${track.name}</div>
        <div class="info-track-artist">${track.artist}</div>
      </div>
    </div>
  `).join('');
  
  const content = `
    <img src="${data.image}" class="info-cover" alt="Cover">
    <div class="info-section">
      <span class="info-type">Playlist</span>
      <h3 class="info-title">${data.name}</h3>
      <p class="info-subtitle">by ${data.owner}</p>
    </div>
    <div class="info-section">
      <div class="info-detail">
        <span class="info-detail-label">Description</span>
        <span class="info-detail-value">${data.description}</span>
      </div>
      <div class="info-detail">
        <span class="info-detail-label">Total Tracks</span>
        <span class="info-detail-value">${data.totalTracks}</span>
      </div>
    </div>
    <div class="info-section">
      <div class="info-tracks">
        ${tracksHtml}
      </div>
    </div>
  `;
  
  document.getElementById('infoPanelContent').innerHTML = content;
  openInfoPanel();
}

function showArtistInfo(data) {
  const topTracksHtml = data.topTracks ? data.topTracks.map((track, i) => `
    <div class="info-track-item">
      <span class="info-track-number">${i + 1}</span>
      <div class="info-track-details">
        <div class="info-track-name">${track.name}</div>
        <div class="info-track-artist">${track.album}</div>
      </div>
    </div>
  `).join('') : '';

  const genresHtml = data.genres && data.genres.length > 0 
    ? data.genres.map(genre => `
        <span style="
          display: inline-block;
          padding: 6px 12px;
          background: var(--bg-secondary);
          border-radius: 20px;
          font-size: 12px;
          margin: 4px;
          color: var(--text-primary);
        ">${genre}</span>
      `).join('')
    : '<span style="color: var(--text-secondary); font-size: 14px;">No genre information</span>';

  const content = `
    ${data.image 
      ? `<img src="${data.image}" class="info-cover" alt="Artist Cover">`
      : `<div class="info-cover-placeholder">🎤</div>`
    }
    
    <div class="info-section">
      <span class="info-type">Artist</span>
      <h3 class="info-title">${data.name}</h3>
      ${data.followers ? `<p class="info-subtitle">${formatNumber(data.followers)} followers</p>` : ''}
    </div>

    <div class="info-section">
      ${data.popularity ? `
        <div class="info-detail">
          <span class="info-detail-label">Popularity</span>
          <span class="info-detail-value">${data.popularity}/100</span>
        </div>
      ` : ''}
    </div>

    ${data.genres && data.genres.length > 0 ? `
      <div class="info-section">
        <div class="info-detail-label" style="margin-bottom: 12px;">Genres</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${genresHtml}
        </div>
      </div>
    ` : ''}

    ${topTracksHtml ? `
      <div class="info-section">
        <div class="info-detail-label" style="margin-bottom: 12px;">Top Tracks</div>
        <div class="info-tracks">
          ${topTracksHtml}
        </div>
      </div>
    ` : ''}
  `;
  
  document.getElementById('infoPanelContent').innerHTML = content;
  openInfoPanel();
}

// Helper
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Show loading
function showInfoLoading() {
  const content = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p class="loading-text">Loading information...</p>
    </div>
  `;
  document.getElementById('infoPanelContent').innerHTML = content;
  openInfoPanel();
}

// Open when URL entered
document.getElementById('spotifyUrl').addEventListener('input', async (e) => {
  url = e.target.value.trim();

  if (window.electronAPI.getApiCredentials() === null) {
    showStatusWithTimeout("Please enter your CLIENT ID and CLIENT SECRET from Settings tab.", "error");
    closeInfoPanel();
    return;
  }

  if (url === "") {
    closeInfoPanel();
    return;
  }

  if (url.includes('spotify.com')) {
    showInfoLoading();

    const data = await window.electronAPI.getSpotifyInfo(url);

    console.log(data);

    if (data.type === "err") {
      showStatusWithTimeout("Cannot load URL informations.", "error");
      closeInfoPanel();
      return
    } else if (data.type === "track") {
      showTrackInfo(data);
    } else if (data.type === "artist") {
      showArtistInfo(data)
    } else if (data.type === "playlist") {
      showPlaylistInfo(data)
    } else if (data.type === "album") {
      // TODO : Panele albüm gösterme ekle mal herif...
    } else {
      console.error("hata");
    }
  }
});
