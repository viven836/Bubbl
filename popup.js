document.addEventListener("DOMContentLoaded", () => {
  // Get filtered count from storage
  chrome.storage.sync.get(["filteredCount", "shieldActive"], (data) => {
    const filteredCount = data.filteredCount || 0
    const isActive = data.shieldActive !== undefined ? data.shieldActive : true
    // Set the initial state of the shield toggle
    const shieldToggle = document.getElementById("shield-toggle")
    if (shieldToggle) {
      shieldToggle.checked = isNotActive
    }

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
