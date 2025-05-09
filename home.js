document.addEventListener("DOMContentLoaded", () => {
    // Get the toggle element
    const bubblToggle = document.getElementById("bubblToggle")
  
    // Check if the toggle state is saved in storage
    chrome.storage.sync.get(["bubblEnabled"], (result) => {
      if (result.bubblEnabled) {
        bubblToggle.checked = true
      }
    })
  
    // Add event listener for toggle changes
    bubblToggle.addEventListener("change", function () {
      // Save the toggle state to storage
      chrome.storage.sync.set({ bubblEnabled: this.checked }, () => {
        console.log("Bubbl is " + (bubblToggle.checked ? "enabled" : "disabled"))
  
        // Send message to background script to update the extension state
        chrome.runtime.sendMessage({
          action: bubblToggle.checked ? "enable" : "disable",
        })
      })
    })
  })
  