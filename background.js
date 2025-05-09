// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
      filterSettings: {
        hateSpeech: true,
        harassment: true,
        profanity: true,
        sensitivity: 7,
      },
      shieldActive: true,
      filteredCount: 0,
    })
  
    // Create context menu for quick filtering
    chrome.contextMenus.create({
      id: "filterComment",
      title: "Filter this comment with Bubbl",
      contexts: ["selection"],
    })
  })
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "filterComment") {
      // Send message to content script to filter the selected comment
      chrome.tabs.sendMessage(tab.id, {
        action: "filterSelection",
        selection: info.selectionText,
      })
    }
  })
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateFilteredCount") {
      // Update badge with number of filtered comments
      chrome.action.setBadgeText({
        text: request.count.toString(),
        tabId: sender.tab?.id,
      })
  
      chrome.action.setBadgeBackgroundColor({
        color: "#0f2e5c",
        tabId: sender.tab?.id,
      })
    }
  })
  
  // Reset filtered count at midnight
  function resetFilteredCount() {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
  
    const timeUntilMidnight = midnight.getTime() - now.getTime()
  
    setTimeout(() => {
      chrome.storage.sync.set({ filteredCount: 0 })
      // Set up the next day's reset
      resetFilteredCount()
    }, timeUntilMidnight)
  }
  
  // Start the reset cycle
  resetFilteredCount()
  