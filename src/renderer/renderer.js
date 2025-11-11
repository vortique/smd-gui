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

// TODO : URL girilince şarkı, playlist veya artist bilgilerini göstert.

// downloadBtn.addEventListener("click", () => {
//   const url_
// });

function fetch_url(url) {
  fetched_url = url.substring(url.lastIndexOf("/") + 1, url.indexOf("?"));

  return fetched_url;
}
