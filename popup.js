/*document.addEventListener("DOMContentLoaded", () => {
    const activeCard = document.getElementById("active-card");
    const inactiveCard = document.getElementById("inactive-card");
    const filteredCountElement = document.getElementById("filtered-count");
    const buttons = document.querySelectorAll(".primary-btn");

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

    // Toggle shield status on button click
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const buttonText = button.textContent.trim();

            if (buttonText === "View Dashboard") {
                chrome.tabs.create({ url: "dashboard.html" });
            } else if (buttonText === "Go to Bubbl") {
                chrome.storage.sync.get("shieldActive", (data) => {
                    const newStatus = !data.shieldActive;
                    chrome.storage.sync.set({ shieldActive: newStatus }, () => {
                        updateUI(newStatus);
                        chrome.runtime.sendMessage({ action: "toggleShield", status: newStatus });
                    });
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
});
*/

document.addEventListener("DOMContentLoaded", () => {
    const activeCard = document.getElementById("active-card");
    const inactiveCard = document.getElementById("inactive-card");
    const filteredCountElement = document.getElementById("filtered-count");
    const buttons = document.querySelectorAll(".primary-btn");

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
});
