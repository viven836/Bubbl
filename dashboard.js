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

/*document.addEventListener("DOMContentLoaded", () => {
    const activeCard = document.getElementById("active-card");
    const inactiveCard = document.getElementById("inactive-card");
    const filteredCountElement = document.getElementById("filtered-count");
    const buttons = document.querySelectorAll(".primary-btn");

    // Dropdown functionality
    const dropdown = document.querySelector('.dropdown');
    const dropdownHeader = document.querySelector('.dropdown-header');
    
    dropdownHeader.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });

    // Check shield status on load
    chrome.storage.sync.get(["shieldActive", "filteredCount"], (data) => {
        const isActive = data.shieldActive !== undefined ? data.shieldActive : false;
        const filteredCount = data.filteredCount || 0;

        updateUI(isActive);
        filteredCountElement.textContent = filteredCount;
    });

    // Function to update UI based on shield status
    function updateUI(isActive) {
        if (isActive) {
            activeCard.style.display = "flex";
            inactiveCard.style.display = "none";
        } else {
            activeCard.style.display = "none";
            inactiveCard.style.display = "flex";
        }
    }

    // Button Click Handlers
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const buttonText = button.textContent.trim();

            if (buttonText === "View Dashboard") {
                chrome.tabs.create({ url: "dashboard.html" });
            } else if (buttonText === "Go to Bubbl") {
                chrome.storage.sync.get("shieldActive", (data) => {
                    const isActive = data.shieldActive || false;

                    if (!isActive) {
                        // Redirect to home.html if shield is inactive
                        chrome.tabs.create({ url: "home.html" });
                    } else {
                        // If for some reason shield is active, show the dashboard
                        chrome.tabs.create({ url: "dashboard.html" });
                    }
                });
            }
        });
    });

    // Listen for messages to update shield status
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "toggleShield") {
            updateUI(request.status);
        } else if (request.action === "updateFilteredCount") {
            filteredCountElement.textContent = request.count;
            chrome.storage.sync.set({ filteredCount: request.count });
        }
    });
});*/
