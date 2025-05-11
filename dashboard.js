/*need this 
document.addEventListener("DOMContentLoaded", () => {
    const shieldToggle = document.getElementById("shield-toggle");
    const sensitivitySlider = document.getElementById("sensitivity");
    const sensitivityValue = document.getElementById("sensitivity-value");
    const hateSpeechCheckbox = document.getElementById("hate-speech");
    const harassmentCheckbox = document.getElementById("harassment");
    const profanityCheckbox = document.getElementById("profanity");

     // Dropdown functionality
     const dropdown = document.querySelector('.dropdown');
     const dropdownHeader = document.querySelector('.dropdown-header');
     
     dropdownHeader.addEventListener('click', () => {
       dropdown.classList.toggle('open');
     });

    // Load settings and shield status
    chrome.storage.sync.get(["filterSettings", "shieldActive"], (data) => {
        shieldToggle.checked = data.shieldActive || false;

        if (data.filterSettings) {
            sensitivitySlider.value = data.filterSettings.sensitivity;
            sensitivityValue.textContent = data.filterSettings.sensitivity;
            hateSpeechCheckbox.checked = data.filterSettings.hateSpeech;
            harassmentCheckbox.checked = data.filterSettings.harassment;
            profanityCheckbox.checked = data.filterSettings.profanity;
        }
    });

    // Toggle change event listener
    shieldToggle.addEventListener("change", function () {
        const newStatus = this.checked;
        chrome.storage.sync.set({ shieldActive: newStatus }, () => {
            console.log("Shield is " + (newStatus ? "enabled" : "disabled"));
            chrome.runtime.sendMessage({ action: "toggleShield", status: newStatus });
        });
    });

    // Listen for toggle updates from other scripts
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "toggleShield") {
            shieldToggle.checked = request.status;
        }
    });

    // Save settings
    function saveSettings() {
        const settings = {
            hateSpeech: hateSpeechCheckbox.checked,
            harassment: harassmentCheckbox.checked,
            profanity: profanityCheckbox.checked,
            sensitivity: parseInt(sensitivitySlider.value)
        };
        chrome.storage.sync.set({ filterSettings: settings });
    }

    // Event listeners for settings
    hateSpeechCheckbox.addEventListener("change", saveSettings);
    harassmentCheckbox.addEventListener("change", saveSettings);
    profanityCheckbox.addEventListener("change", saveSettings);
    sensitivitySlider.addEventListener("change", saveSettings);

    sensitivitySlider.addEventListener("input", () => {
        sensitivityValue.textContent = sensitivitySlider.value;
    });
});

*/


document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const shieldToggle = document.getElementById("shield-toggle")
  const sensitivitySlider = document.getElementById("sensitivity")
  const sensitivityValue = document.getElementById("sensitivity-value")
  const hateSpeechCheckbox = document.getElementById("hate-speech")
  const harassmentCheckbox = document.getElementById("harassment")
  const profanityCheckbox = document.getElementById("profanity")
  const todayCountElement = document.getElementById("today-count")
  const totalCountElement = document.getElementById("total-count")
  const sitesCountElement = document.getElementById("sites-count")

  // Dropdown functionality
  const dropdown = document.querySelector(".dropdown")
  const dropdownHeader = document.querySelector(".dropdown-header")

  dropdownHeader.addEventListener("click", () => {
    dropdown.classList.toggle("open")
  })

  // Load settings and statistics
  function loadData() {
    chrome.storage.sync.get(
      ["filterSettings", "shieldActive", "filteredCount", "totalFiltered", "sitesProtected", "stats"],
      (data) => {
        // Load shield status
        if (data.shieldActive !== undefined) {
          shieldToggle.checked = data.shieldActive
        }

        // Load filter settings
        if (data.filterSettings) {
          sensitivitySlider.value = data.filterSettings.sensitivity
          sensitivityValue.textContent = data.filterSettings.sensitivity

          hateSpeechCheckbox.checked = data.filterSettings.hateSpeech
          harassmentCheckbox.checked = data.filterSettings.harassment
          profanityCheckbox.checked = data.filterSettings.profanity
        }

        // Update statistics
        const todayFiltered = data.filteredCount || 0
        const totalFiltered = data.totalFiltered || 0
        const sitesProtected = data.sitesProtected || 0

        // Calculate safe browsing percentage (between 70-100% for better UX)
        let safePercentage = 100
        if (todayFiltered > 0) {
          // More filtered content means lower percentage, but never below 70%
          safePercentage = Math.max(70, 100 - todayFiltered * 0.5)
        }

        // Update UI
        todayCountElement.textContent = todayFiltered
        totalCountElement.textContent = Math.round(safePercentage) + "%"
        sitesCountElement.textContent = totalFiltered

        console.log("[Bubbl Dashboard] Statistics updated:", {
          todayFiltered,
          safePercentage: Math.round(safePercentage) + "%",
          totalFiltered,
          sitesProtected,
        })
      },
    )
  }

  // Toggle change event listener
  shieldToggle.addEventListener("change", function () {
    const newStatus = this.checked
    chrome.storage.sync.set({ shieldActive: newStatus }, () => {
      console.log("Shield is " + (newStatus ? "enabled" : "disabled"))
      chrome.runtime.sendMessage({ action: "toggleShield", status: newStatus })

      // Force refresh all tabs to apply the change immediately
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "forceRescan",
            })
            .catch((error) => {
              console.warn("Failed to send message to tab:", tab.id, error)
              // Ignore errors for tabs that don't have the content script
            })
        })
      })
    })
  })

  // Listen for toggle updates from other scripts
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "toggleShield") {
      shieldToggle.checked = request.status
    }
  })

  // Save settings
  function saveSettings() {
    const settings = {
      hateSpeech: hateSpeechCheckbox.checked,
      harassment: harassmentCheckbox.checked,
      profanity: profanityCheckbox.checked,
      sensitivity: Number.parseInt(sensitivitySlider.value),
    }

    chrome.storage.sync.set(
      {
        filterSettings: settings,
      },
      () => {
        console.log("Settings saved:", settings)

        // Notify all tabs that settings have changed
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs
              .sendMessage(tab.id, {
                action: "settingsUpdated",
                settings: settings,
              })
              .catch((error) => {
                console.warn("Failed to send message to tab:", tab.id, error)
                // Ignore errors for tabs that don't have the content script
              })
          })
        })
      },
    )
  }

  // Event listeners for settings
  hateSpeechCheckbox.addEventListener("change", saveSettings)
  harassmentCheckbox.addEventListener("change", saveSettings)
  profanityCheckbox.addEventListener("change", saveSettings)

  sensitivitySlider.addEventListener("input", () => {
    sensitivityValue.textContent = sensitivitySlider.value
  })

  sensitivitySlider.addEventListener("change", saveSettings)

  // Load data initially
  loadData()

  // Refresh data every 5 seconds
  setInterval(loadData, 5000)
})

