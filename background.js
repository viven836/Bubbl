/*need this
// AI Shield - Content Script
// This script runs in the background and manages the extension's core functionality
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

*/





// Bubbl Extension - Background Script
// Handles extension-wide functionality and communication

// Track statistics
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

// Throttle storage writes to avoid quota errors
let pendingWrites = {}
let writeTimeout = null
const WRITE_DELAY = 2000 // Delay between batched writes

function throttledStorageWrite(data) {
  // Merge the new data with any pending writes
  pendingWrites = { ...pendingWrites, ...data }

  // Clear existing timeout if there is one
  if (writeTimeout) {
    clearTimeout(writeTimeout)
  }

  // Set a new timeout to perform the write
  writeTimeout = setTimeout(() => {
    // Only write if we have data
    if (Object.keys(pendingWrites).length > 0) {
      chrome.storage.sync.set(pendingWrites, () => {
        if (chrome.runtime.lastError) {
          console.error("[Bubbl] Storage write error:", chrome.runtime.lastError)
        } else {
          console.log("[Bubbl] Storage updated with:", pendingWrites)
        }
        pendingWrites = {} // Clear pending writes
      })
    }
  }, WRITE_DELAY)
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("[Bubbl] Extension installed/updated")

  // Load existing stats first, then set defaults only for missing values
  chrome.storage.sync.get(["stats", "totalFiltered", "filteredCount", "sitesProtected"], (data) => {
    // Preserve existing total if available
    const existingTotal = data.totalFiltered || 0
    const existingFiltered = data.filteredCount || 0
    const existingSites = data.sitesProtected || 0

    // Load existing stats if available
    if (data.stats) {
      stats = data.stats

      // Reset daily count if it's a new day
      const today = new Date().toDateString()
      if (stats.lastReset !== today) {
        stats.todayFiltered = 0
        stats.lastReset = today
      }
    } else {
      // Initialize stats with existing totals
      stats.totalFiltered = existingTotal
    }

    // Set default settings without overwriting existing stats
    throttledStorageWrite({
      shieldActive: true,
      filterSettings: {
        hateSpeech: true,
        harassment: true,
        profanity: true,
        sensitivity: 7,
      },
      // Preserve existing statistics
      filteredCount: existingFiltered,
      totalFiltered: existingTotal,
      sitesProtected: existingSites,
      stats: stats,
    })
  })

  // Create context menu
  chrome.contextMenus.create({
    id: "reportHateSpeech",
    title: "Report hate speech to Bubbl",
    contexts: ["selection"],
  })
})

// Save stats to storage (throttled)
function saveStats() {
  throttledStorageWrite({
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
    // Get current stats before resetting
    chrome.storage.sync.get(["stats", "totalFiltered"], (data) => {
      // Preserve the total count
      const preservedTotal = data.totalFiltered || 0

      // Reset only the daily count
      stats.todayFiltered = 0
      stats.lastReset = new Date().toDateString()

      // Make sure we don't lose the total
      stats.totalFiltered = preservedTotal

      // Save updated stats
      throttledStorageWrite({
        filteredCount: 0,
        totalFiltered: preservedTotal,
        stats: stats,
      })

      // Schedule next reset
      scheduleStatsReset()
    })
  }, timeUntilMidnight)
}

// Start the daily reset schedule
scheduleStatsReset()

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "reportHateSpeech" && info.selectionText) {
    // Send the selected text to the content script for analysis
    if (tab.id) {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "analyzeSelection",
          text: info.selectionText,
        })
        .catch(() => {
          console.log("[Bubbl] Could not send analyzeSelection message to tab")
        })
    }
  }
})

// Function to safely send messages to tabs
function safelySendMessageToTab(tabId, message) {
  // Only send to http/https tabs (not chrome:// or extension:// pages)
  chrome.tabs
    .get(tabId, (tab) => {
      if (tab && tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
        chrome.tabs.sendMessage(tabId, message).catch(() => {
          // Silently ignore errors for tabs that don't have content script
          console.log(`[Bubbl] Tab ${tabId} not ready for messages (normal for non-content tabs)`)
        })
      }
    })
    .catch(() => {
      // Tab might not exist anymore
      console.log(`[Bubbl] Tab ${tabId} does not exist or cannot be accessed`)
    })
}

// Listen for messages from content script and dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Update badge when content is filtered
  if (message.action === "updateFilteredCount") {
    const count = message.count || 0

    // Update badge
    if (sender.tab?.id) {
      chrome.action.setBadgeText({
        text: count.toString(),
        tabId: sender.tab.id,
      })

      chrome.action.setBadgeBackgroundColor({
        color: "#0f2e5c",
        tabId: sender.tab.id,
      })
    }

    // Update today's count
    stats.todayFiltered = count

    // Throttled write to avoid quota issues
    throttledStorageWrite({ filteredCount: count })
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

  // Handle content viewed events
  else if (message.action === "contentViewed") {
    console.log("[Bubbl] User viewed filtered content:", message.categories)
  }

  // Handle toggle shield action from dashboard.js
  else if (message.action === "toggleShield") {
    console.log("[Bubbl] Shield toggled:", message.status ? "enabled" : "disabled")

    // Update storage
    chrome.storage.sync.set({ shieldActive: message.status })

    // Broadcast to all tabs with error handling
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          safelySendMessageToTab(tab.id, {
            action: message.status ? "enableShield" : "disableShield",
          })
        }
      })
    })

    // Send response
    sendResponse({ success: true })
    return true // Keep the message channel open for the async response
  }

  // Handle settings updated action from dashboard.js
  else if (message.action === "settingsUpdated") {
    console.log("[Bubbl] Settings updated:", message.settings)

    // Broadcast to all tabs with error handling
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          safelySendMessageToTab(tab.id, {
            action: "settingsUpdated",
            settings: message.settings,
          })
        }
      })
    })

    // Send response
    sendResponse({ success: true })
    return true // Keep the message channel open for the async response
  }
})

// Set up alarm for periodic tasks
chrome.alarms.create("periodicTasks", { periodInMinutes: 30 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodicTasks") {
    // Check if any tabs need rescanning
    chrome.tabs.query({ active: true }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          safelySendMessageToTab(tab.id, { action: "checkStatus" })
        }
      })
    })
  }
})

console.log("[Bubbl] Background script initialized")
