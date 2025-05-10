/*// Initialize default settings when extension is installed
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
  */
// Bubbl Extension - Background Script
// Handles extension-wide functionality and communication

// Track statistics
let stats = {
  totalFiltered: 0,
  todayFiltered: 0,
  sitesProtected: new Set(),
  categoryCounts: {
    toxicity: 0,
    identity_attack: 0,
    insult: 0,
    threat: 0,
    sexual_explicit: 0,
    obscene: 0,
  },
  lastReset: new Date().toDateString(),
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("[Bubbl] Extension installed/updated")

  // Set default settings
  chrome.storage.sync.set({
    shieldActive: true,
    filterSettings: {
      hateSpeech: true,
      harassment: true,
      profanity: true,
      sensitivity: 70,
    },
    filteredCount: 0,
    totalFiltered: 0,
    sitesProtected: 0,
  })

  // Load existing stats if available
  chrome.storage.sync.get(["stats"], (data) => {
    if (data.stats) {
      stats = data.stats

      // Reset daily count if it's a new day
      const today = new Date().toDateString()
      if (stats.lastReset !== today) {
        stats.todayFiltered = 0
        stats.lastReset = today
        saveStats()
      }
    }
  })

  // Create context menu
  chrome.contextMenus.create({
    id: "reportHateSpeech",
    title: "Report hate speech to Bubbl",
    contexts: ["selection"],
  })
})

// Save stats to storage
function saveStats() {
  chrome.storage.sync.set({
    stats: stats,
    totalFiltered: stats.totalFiltered,
    sitesProtected: stats.sitesProtected.size,
  })
}

// Reset daily stats at midnight
function scheduleStatsReset() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const timeUntilMidnight = tomorrow.getTime() - now.getTime()

  setTimeout(() => {
    stats.todayFiltered = 0
    stats.lastReset = new Date().toDateString()
    saveStats()

    // Schedule next reset
    scheduleStatsReset()
  }, timeUntilMidnight)
}

// Start the daily reset schedule
scheduleStatsReset()

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "reportHateSpeech" && info.selectionText) {
    // Send the selected text to the content script for analysis
    chrome.tabs.sendMessage(tab.id, {
      action: "analyzeSelection",
      text: info.selectionText,
    })
  }
})

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Update badge when content is filtered
  if (message.action === "updateFilteredCount") {
    const count = message.count || 0

    // Update badge
    chrome.action.setBadgeText({
      text: count.toString(),
      tabId: sender.tab?.id,
    })

    chrome.action.setBadgeBackgroundColor({
      color: "#0f2e5c",
      tabId: sender.tab?.id,
    })

    // Update today's count
    stats.todayFiltered = count
    saveStats()
  }

  // Track when content is filtered
  else if (message.action === "contentFiltered") {
    // Increment total filtered count
    stats.totalFiltered++

    // Add site to protected sites
    if (sender.tab?.url) {
      const url = new URL(sender.tab.url)
      stats.sitesProtected.add(url.hostname)
    }

    // Update category counts
    if (message.categories && Array.isArray(message.categories)) {
      message.categories.forEach((cat) => {
        const category = cat.category
        if (stats.categoryCounts[category] !== undefined) {
          stats.categoryCounts[category]++
        }
      })
    }

    saveStats()
  }

  // Track when model is loaded
  else if (message.action === "modelLoaded") {
    console.log(`[Bubbl] Model loaded: ${message.success ? "Success" : "Failed"}`)

    // If model failed to load, we could implement retry logic here
    if (!message.success) {
      console.error("[Bubbl] Model loading error:", message.error)
    }
  }
})

// Set up alarm for periodic tasks
chrome.alarms.create("periodicTasks", { periodInMinutes: 30 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodicTasks") {
    // Check if any tabs need rescanning
    chrome.tabs.query({ active: true }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: "checkStatus" }, (response) => {
          // If we got a response but model isn't loaded, force a rescan
          if (response && !response.isModelLoaded && response.isShieldEnabled) {
            chrome.tabs.sendMessage(tab.id, { action: "forceRescan" })
          }
        })
      })
    })
  }
})

// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open onboarding page for new installations
    chrome.tabs.create({ url: "onboarding.html" })
  }
})


// Bubbl Extension - Background Script
// Handles extension-wide functionality and communication

/*// Track statistics
let stats = {
  totalFiltered: 0,
  todayFiltered: 0,
  sitesProtected: new Set(),
  categoryCounts: {
    hate_speech: 0,
    harassment: 0,
    profanity: 0,
  },
  lastReset: new Date().toDateString(),
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("[Bubbl] Extension installed/updated")

  // Set default settings
  chrome.storage.sync.set({
    shieldActive: true,
    filterSettings: {
      hateSpeech: true,
      harassment: true,
      profanity: true,
      sensitivity: 70,
    },
    filteredCount: 0,
    totalFiltered: 0,
    sitesProtected: 0,
  })

  // Load existing stats if available
  chrome.storage.sync.get(["stats"], (data) => {
    if (data.stats) {
      stats = data.stats

      // Reset daily count if it's a new day
      const today = new Date().toDateString()
      if (stats.lastReset !== today) {
        stats.todayFiltered = 0
        stats.lastReset = today
        saveStats()
      }
    }
  })

  // Create context menu
  chrome.contextMenus.create({
    id: "reportHateSpeech",
    title: "Report hate speech to Bubbl",
    contexts: ["selection"],
  })
})

// Save stats to storage
function saveStats() {
  chrome.storage.sync.set({
    stats: stats,
    totalFiltered: stats.totalFiltered,
    sitesProtected: stats.sitesProtected.size,
  })
}

// Reset daily stats at midnight
function scheduleStatsReset() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const timeUntilMidnight = tomorrow.getTime() - now.getTime()

  setTimeout(() => {
    stats.todayFiltered = 0
    stats.lastReset = new Date().toDateString()
    saveStats()

    // Schedule next reset
    scheduleStatsReset()
  }, timeUntilMidnight)
}

// Start the daily reset schedule
scheduleStatsReset()

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "reportHateSpeech" && info.selectionText) {
    // Send the selected text to the content script for analysis
    chrome.tabs.sendMessage(tab.id, {
      action: "analyzeSelection",
      text: info.selectionText,
    })
  }
})

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Update badge when content is filtered
  if (message.action === "updateFilteredCount") {
    const count = message.count || 0

    // Update badge
    chrome.action.setBadgeText({
      text: count.toString(),
      tabId: sender.tab?.id,
    })

    chrome.action.setBadgeBackgroundColor({
      color: "#0f2e5c",
      tabId: sender.tab?.id,
    })

    // Update today's count
    stats.todayFiltered = count
    saveStats()
  }

  // Track when content is filtered
  else if (message.action === "contentFiltered") {
    // Increment total filtered count
    stats.totalFiltered++

    // Add site to protected sites
    if (sender.tab?.url) {
      const url = new URL(sender.tab.url)
      stats.sitesProtected.add(url.hostname)
    }

    // Update category counts
    if (message.categories && Array.isArray(message.categories)) {
      message.categories.forEach((cat) => {
        const category = cat.category
        if (stats.categoryCounts[category] !== undefined) {
          stats.categoryCounts[category]++
        }
      })
    }

    saveStats()
  }
})

// Set up alarm for periodic tasks
chrome.alarms.create("periodicTasks", { periodInMinutes: 30 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodicTasks") {
    // Check if any tabs need rescanning
    chrome.tabs.query({ active: true }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: "checkStatus" }, (response) => {
          // If we got a response but shield isn't working, force a rescan
          if (response && response.isShieldEnabled) {
            chrome.tabs.sendMessage(tab.id, { action: "forceRescan" })
          }
        })
      })
    })
  }
})

*/