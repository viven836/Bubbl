/*

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
*/

document.addEventListener("DOMContentLoaded", () => {
  // Get filtered count from storage
  chrome.storage.sync.get(["filteredCount", "shieldActive"], (data) => {
    const filteredCount = data.filteredCount || 0
    const isActive = data.shieldActive !== undefined ? data.shieldActive : true

    // Update the filtered count in the popup
    const filteredCountElement = document.getElementById("filtered-count")
    if (filteredCountElement) {
      filteredCountElement.textContent = filteredCount
    }

    // Update UI based on shield status
    updateUI(isActive)
  })

  // Function to update UI based on shield status
  function updateUI(isActive) {
    const activeCard = document.getElementById("active-card")
    const inactiveCard = document.getElementById("inactive-card")

    if (activeCard && inactiveCard) {
      if (isActive) {
        activeCard.style.display = "flex"
        inactiveCard.style.display = "none"
      } else {
        activeCard.style.display = "none"
        inactiveCard.style.display = "flex"
      }
    }
  }

  // Add event listeners to buttons
  const buttons = document.querySelectorAll(".primary-btn")
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const buttonText = button.textContent.trim()

      if (buttonText === "View Dashboard") {
        chrome.tabs.create({ url: "dashboard.html" })
      } else if (buttonText === "Go to Bubbl") {
        chrome.tabs.create({ url: "dashboard.html?activate=true" })
      }
    })
  })

  // Listen for messages to update filtered count
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "updateFilteredCount") {
      const filteredCountElement = document.getElementById("filtered-count")
      if (filteredCountElement) {
        filteredCountElement.textContent = request.count
      }
    }
  })
})
