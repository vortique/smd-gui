// Tema yönetimi
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// Kaydedilmiş temayı kontrol et veya sistem temasını kullan
const savedTheme = localStorage.getItem("theme") || getSystemTheme();
setTheme(savedTheme);

// Sistem teması değişikliğini dinle
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      setTheme(e.matches ? "dark" : "light");
    }
  });

// Form elemanları
const settingsForm = document.getElementById("settingsForm");
const clientIdInput = document.getElementById("clientId");
const clientSecretInput = document.getElementById("clientSecret");
const toggleSecretBtn = document.getElementById("toggleSecret");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const statusMessage = document.getElementById("statusMessage");

// Şifre göster/gizle
toggleSecretBtn.addEventListener("click", () => {
  const type = clientSecretInput.type === "password" ? "text" : "password";
  clientSecretInput.type = type;
  toggleSecretBtn.textContent = type === "password" ? "👁️" : "🙈";
});

// Durum mesajı göster
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message active ${type}`;

  setTimeout(() => {
    statusMessage.classList.remove("active");
  }, 4000);
}

// Form gönderimi
settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const clientId = clientIdInput.value.trim();
  const clientSecret = clientSecretInput.value.trim();

  // Validasyon
  if (!clientId || !clientSecret) {
    showStatus("Please enter every input field!", "error");
    return;
  }

  if (clientId.length < 20 || clientSecret.length < 20) {
    showStatus("Client ID or Secret is too short!", "error");
    return;
  }

  // Kaydetme işlemi
  saveBtn.disabled = true;
  saveBtn.textContent = "⏳ Saving...";

  try {
    const result = await window.electronAPI.saveSettings(clientId, clientSecret);

    if (result.success) {
      showStatus("✅ API information's is saved successfully!", "success");
    } else {
      showStatus("❌ Error while saving options!", "success");
      return
    }

    // 1.5 saniye sonra pencereyi kapat
    setTimeout(() => {
      window.electronAPI.closeSettingsWindow();
      console.log("Options set, window is closing...");
    }, 1500);
  } catch (error) {
    showStatus("❌ Error while saving keys!", "error");
    console.error("Hata:", error);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "💾 Save";
  }
});

// İptal butonu
cancelBtn.addEventListener("click", () => {
  window.electronAPI.closeSettingsWindow();
  console.log("Options window will close...");
});

// Kaydedilmiş değerleri yükle (varsa)
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const credentials = await window.electronAPI.getApiCredentials();
    if (credentials !== null) {
        clientIdInput.value = credentials["client-id"] || '';
        clientSecretInput.value = credentials["client-secret"] || '';
    }
  } catch (error) {
    console.error("Saved options cannot be extracted:", error);
  }
});

// Enter tuşu ile kaydet
clientSecretInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    settingsForm.dispatchEvent(new Event("submit"));
  }
});
