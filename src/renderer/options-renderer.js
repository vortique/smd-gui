function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// Look for saved theme and change to it
const savedTheme = localStorage.getItem("theme") || getSystemTheme();
setTheme(savedTheme);

// Listen system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      setTheme(e.matches ? "dark" : "light");
    }
  });

// Form elements
const settingsForm = document.getElementById("settingsForm");
const clientIdInput = document.getElementById("clientId");
const clientSecretInput = document.getElementById("clientSecret");
const customTrackPathInput = document.getElementById("customTrackPath");
const ytDlpSearchCountInput = document.getElementById("ytDlpSearchCount");
const toggleSecretBtn = document.getElementById("toggleSecret");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const statusMessage = document.getElementById("statusMessage");

// Tab switching logic
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const tabId = btn.getAttribute("data-tab");
    document.getElementById(tabId).classList.add("active");
  });
});

// Show/Hide password
toggleSecretBtn.addEventListener("click", () => {
  const type = clientSecretInput.type === "password" ? "text" : "password";
  clientSecretInput.type = type;
  toggleSecretBtn.textContent = type === "password" ? "👁️" : "🙈";
});

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message active ${type}`;

  setTimeout(() => {
    statusMessage.classList.remove("active");
  }, 4000);
}

// Form submitting
settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const clientId = clientIdInput.value.trim();
  const clientSecret = clientSecretInput.value.trim();
  const customTrackPath = customTrackPathInput.value.trim();
  const ytDlpSearchCount = parseInt(ytDlpSearchCountInput.value);

  // Validation
  if (!clientId || !clientSecret) {
    showStatus("Please enter every input field!", "error");
    return;
  }

  if (clientId.length < 20 || clientSecret.length < 20) {
    showStatus("Client ID or Secret is too short!", "error");
    return;
  }

  // Saving
  saveBtn.disabled = true;
  saveBtn.textContent = "⏳ Saving...";

  try {
    const result = await window.electronAPI.saveSettings(
      clientId,
      clientSecret,
      customTrackPath,
      ytDlpSearchCount
    );

    if (result.success) {
      showStatus("✅ Settings saved successfully!", "success");
    } else {
      showStatus("❌ Error while saving options!", "error");
      return;
    }

    // Close window after 1.5 seconds
    setTimeout(() => {
      window.electronAPI.closeSettingsWindow();
      console.log("Options set, window is closing...");
    }, 1500);
  } catch (error) {
    showStatus("❌ Error while saving settings!", "error");
    console.error("Error:", error);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "💾 Save Settings";
  }
});

// Cancel button
cancelBtn.addEventListener("click", () => {
  window.electronAPI.closeSettingsWindow();
  console.log("Options window will close...");
});

// Load saved settings (if there)
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const options = await window.electronAPI.getOptions();
    if (options !== null) {
      clientIdInput.value = options["client-id"] || "";
      clientSecretInput.value = options["client-secret"] || "";
      customTrackPathInput.value = options["custom-track-path"] || "";
      ytDlpSearchCountInput.value = options["yt-dlp-search-count"] || 3;
    }
  } catch (error) {
    console.error("Saved options cannot be extracted:", error);
  }
});

// Save with enter key
clientSecretInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    settingsForm.dispatchEvent(new Event("submit"));
  }
});
