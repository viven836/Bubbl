

// Bubbl Extension: Advanced toxic content filter
// Improved implementation that works with strict CSP policies

// Configuration variables
let isShieldEnabled = true
let hateSpeechEnabled = true
let harassmentEnabled = true
let profanityEnabled = true
let sensitivity = 70 // Default sensitivity (0-100)
let filteredCount = 0 // Track number of filtered comments
let processedNodes = new WeakSet() // Track processed nodes to avoid duplicates

// Constants
const SCAN_INTERVAL = 1500 // Milliseconds between scans

// Platform-specific selectors for comments
const PLATFORM_SELECTORS = {
  // YouTube
  youtube: [".ytd-comment-renderer", ".ytd-comment-thread-renderer", ".comment-text"],
  // Twitter/X
  twitter: ['[data-testid="tweetText"]', ".tweet-text", ".r-1qd0xha"],
  // Reddit
  reddit: [".Comment__body", ".RichTextJSON-root", ".md", ".usertext-body"],
  // Facebook
  facebook: [".userContent", ".commentBody", ".UFICommentBody"],
  // Instagram
  instagram: [".C4VMK", "._a9zs", ".x1lliihq"],
  // General selectors (used across all sites)
  general: [
    "p",
    ".comment",
    ".comments",
    ".comment-body",
    ".comment-content",
    ".comment-text",
    ".message-body",
    ".post-body",
    ".post-content",
    ".post-text",
    ".article-body",
    ".article-content",
  ],
}

// Get all selectors for the current site
function getRelevantSelectors() {
  const hostname = window.location.hostname
  let selectors = [...PLATFORM_SELECTORS.general] // Always include general selectors

  if (hostname.includes("youtube")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.youtube]
  } else if (hostname.includes("twitter") || hostname.includes("x.com")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.twitter]
  } else if (hostname.includes("reddit")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.reddit]
  } else if (hostname.includes("facebook")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.facebook]
  } else if (hostname.includes("instagram")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.instagram]
  }

  return selectors
}

// Simple text-based toxicity detection
// This is a fallback when the ML model can't be loaded due to CSP restrictions
function detectToxicContent(text) {
  if (!text || typeof text !== "string") return { isToxic: false, categories: [] }

  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase()

  // Define patterns for different categories of toxic content
  const patterns = {
    hate_speech: [
      /\b(hate|hating|hated)\b/i,
      /\b(racist|racism|bigot|bigotry)\b/i,
      /\b(sexist|sexism|misogyn|misandr)\b/i,
      /\b(homophob|transphob)\b/i,
      /\bn[i1]gg[e3]r/i,
      /\bf[a@]gg[o0]t/i,
      /\bk[i1]k[e3]/i,
      /\bch[i1]nk/i,
      /\bsp[i1]c/i,
      /\bg[o0][o0]k/i,
      /\bw[e3]tb[a@]ck/i,
      /\br[e3]t[a@]rd/i,
    ],
    harassment: [
      /\b(stupid|idiot|dumb|moron)\b/i,
      /\b(ugly|fat|disgusting)\b/i,
      /\b(kill|die|death|suicide)\b/i,
      /\b(threat|threaten)\b/i,
      /\b(attack|assault)\b/i,
      /\b(bully|bullying)\b/i,
      /\b(harass|harassment)\b/i,
      /\b(loser|pathetic|worthless)\b/i,
    ],
    profanity: [
      /\b(fuck|fucking|fucker|fucked)\b/i,
      /\b(shit|shitty|bullshit|bs)\b/i,
      /\b(ass|asshole)\b/i,
      /\b(bitch|bitches)\b/i,
      /\b(cunt)\b/i,
      /\b(dick|cock|penis)\b/i,
      /\b(pussy|vagina)\b/i,
      /\b(whore|slut)\b/i,
      /\b(damn|goddamn)\b/i,
    ],
  }

  // Check for matches in each category
  const detectedCategories = []
  let isToxic = false

  // Check hate speech patterns if enabled
  if (hateSpeechEnabled) {
    for (const pattern of patterns.hate_speech) {
      if (pattern.test(lowerText)) {
        detectedCategories.push({ category: "hate_speech", pattern: pattern.toString() })
        isToxic = true
        break
      }
    }
  }

  // Check harassment patterns if enabled
  if (harassmentEnabled && !isToxic) {
    for (const pattern of patterns.harassment) {
      if (pattern.test(lowerText)) {
        detectedCategories.push({ category: "harassment", pattern: pattern.toString() })
        isToxic = true
        break
      }
    }
  }

  // Check profanity patterns if enabled
  if (profanityEnabled && !isToxic) {
    for (const pattern of patterns.profanity) {
      if (pattern.test(lowerText)) {
        detectedCategories.push({ category: "profanity", pattern: pattern.toString() })
        isToxic = true
        break
      }
    }
  }

  // Apply sensitivity threshold - higher sensitivity means more content gets filtered
  // For simplicity, we'll just adjust based on how many matches we found
  if (isToxic) {
    // If sensitivity is low (below 30), require multiple matches
    if (sensitivity < 30 && detectedCategories.length < 2) {
      isToxic = false
    }
    // If sensitivity is medium (30-70), one match is enough (default behavior)
    // If sensitivity is high (above 70), even partial matches could trigger
    else if (sensitivity > 70) {
      // We could add more aggressive pattern matching here
      // For now, we'll keep the existing behavior
    }
  }

  return { isToxic, categories: detectedCategories }
}

// Create a blurred overlay for toxic content
function createBlurredOverlay(node, toxicCategories) {
  // Save original styles
  const originalDisplay = node.style.display
  const originalPosition = node.style.position
  const originalHeight = node.offsetHeight
  const originalWidth = node.offsetWidth

  // Create wrapper
  const wrapper = document.createElement("div")
  wrapper.className = "bubbl-toxic-content-wrapper"
  wrapper.style.position = "relative"
  wrapper.style.width = "100%"
  wrapper.style.minHeight = originalHeight + "px"

  // Hide the original content
  node.style.filter = "blur(8px)"
  node.style.userSelect = "none"
  node.style.pointerEvents = "none"

  // Create overlay
  const overlay = document.createElement("div")
  overlay.className = "bubbl-toxic-content-overlay"
  overlay.style.position = "absolute"
  overlay.style.top = "0"
  overlay.style.left = "0"
  overlay.style.width = "100%"
  overlay.style.height = "100%"
  overlay.style.backgroundColor = "rgba(123, 95, 201, 0.1)"
  overlay.style.backdropFilter = "blur(4px)"
  overlay.style.borderRadius = "8px"
  overlay.style.display = "flex"
  overlay.style.flexDirection = "column"
  overlay.style.alignItems = "center"
  overlay.style.justifyContent = "center"
  overlay.style.padding = "15px"
  overlay.style.zIndex = "9999"
  overlay.style.fontFamily = '"Poppins", sans-serif'

  // Create message
  const message = document.createElement("div")
  message.className = "bubbl-message"
  message.style.color = "#ffffff"
  message.style.fontWeight = "500"
  message.style.textAlign = "center"
  message.style.marginBottom = "10px"
  message.innerHTML =
    '<span style="font-size: 18px;">🛡️ Bubbl will keep you safe</span><br><span style="font-size: 14px; opacity: 0.8;">Potentially harmful content hidden</span>'

  // Create show button
  const showButton = document.createElement("button")
  showButton.className = "bubbl-show-content-btn"
  showButton.textContent = "Show anyway"
  showButton.style.backgroundColor = "#0f2e5c"
  showButton.style.color = "white"
  showButton.style.border = "none"
  showButton.style.borderRadius = "20px"
  showButton.style.padding = "8px 16px"
  showButton.style.fontSize = "12px"
  showButton.style.cursor = "pointer"
  showButton.style.fontFamily = '"Poppins", sans-serif'
  showButton.style.fontWeight = "500"
  showButton.style.marginTop = "10px"

  // Add event listener to show button
  showButton.addEventListener("click", () => {
    node.style.filter = ""
    node.style.userSelect = ""
    node.style.pointerEvents = ""
    overlay.style.display = "none"

    // Log that user viewed the content
    chrome.runtime.sendMessage({
      action: "contentViewed",
      categories: toxicCategories,
    })
  })

  // Assemble overlay
  overlay.appendChild(message)
  overlay.appendChild(showButton)

  // Insert wrapper and overlay
  node.parentNode.insertBefore(wrapper, node)
  wrapper.appendChild(node)
  wrapper.appendChild(overlay)

  // Increment filtered count and update storage
  filteredCount++
  chrome.storage.sync.set({ filteredCount: filteredCount })
  chrome.runtime.sendMessage({
    action: "updateFilteredCount",
    count: filteredCount,
  })

  return wrapper
}

// Process text content with pattern-based detection
function processContent(node) {
  // Skip if already processed or no content
  if (processedNodes.has(node)) return
  if (!node || !node.textContent || node.textContent.trim().length < 5) return

  // Mark as processed to avoid duplicate processing
  processedNodes.add(node)

  // Skip processing if shield is disabled
  if (!isShieldEnabled) return

  try {
    const text = node.textContent.trim()

    // Skip very short text
    if (text.length < 5) return

    // Use pattern-based detection instead of ML model
    const result = detectToxicContent(text)

    // Filter the content if toxic categories were detected
    if (result.isToxic && result.categories.length > 0) {
      console.log(`[Bubbl] 🛡️ Filtered content with categories:`, result.categories)
      createBlurredOverlay(node, result.categories)

      // Send statistics to background
      chrome.runtime.sendMessage({
        action: "contentFiltered",
        categories: result.categories,
        url: window.location.href,
      })
    }
  } catch (error) {
    console.error("[Bubbl] ❌ Error processing content:", error)
  }
}

// Scan the page for comment-like content
function scanAndProcessComments() {
  if (!isShieldEnabled) return

  // Get selectors for the current site
  const selectors = getRelevantSelectors()
  const selectorString = selectors.join(", ")

  try {
    // Find all potential comment nodes
    const commentNodes = document.querySelectorAll(selectorString)

    // Process each node
    commentNodes.forEach((node) => {
      // Skip very small nodes and already processed nodes
      if (node.textContent && node.textContent.trim().length >= 5 && !processedNodes.has(node)) {
        processContent(node)
      }
    })
  } catch (error) {
    console.error("[Bubbl] ❌ Error scanning comments:", error)
  }
}

// Set up mutation observer to detect new comments
function setupMutationObserver() {
  // Create a mutation observer to watch for new content
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false

    mutations.forEach((mutation) => {
      // Check if nodes were added
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        shouldScan = true
      }
    })

    // Scan if new nodes were added
    if (shouldScan) {
      scanAndProcessComments()
    }
  })

  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  })

  console.log("[Bubbl] 👀 Mutation observer started")
}

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(["shieldActive", "filterSettings", "filteredCount"], (data) => {
    // Set shield status
    isShieldEnabled = data.shieldActive !== undefined ? data.shieldActive : true

    // Get filter settings
    if (data.filterSettings) {
      hateSpeechEnabled = data.filterSettings.hateSpeech !== undefined ? data.filterSettings.hateSpeech : true
      harassmentEnabled = data.filterSettings.harassment !== undefined ? data.filterSettings.harassment : true
      profanityEnabled = data.filterSettings.profanity !== undefined ? data.filterSettings.profanity : true
      sensitivity = data.filterSettings.sensitivity !== undefined ? data.filterSettings.sensitivity : 70
    }

    // Get filtered count
    filteredCount = data.filteredCount || 0

    console.log("[Bubbl] ⚙️ Settings loaded:", {
      isShieldEnabled,
      hateSpeechEnabled,
      harassmentEnabled,
      profanityEnabled,
      sensitivity,
      filteredCount,
    })

    // Initialize if shield is enabled
    if (isShieldEnabled) {
      scanAndProcessComments()
      setupMutationObserver()
    }
  })
}

// Listen for setting changes
chrome.storage.onChanged.addListener((changes) => {
  // Update shield status
  if (changes.shieldActive) {
    isShieldEnabled = changes.shieldActive.newValue

    // Scan if shield was enabled
    if (isShieldEnabled) {
      scanAndProcessComments()
    }
  }

  // Update filter settings
  if (changes.filterSettings && changes.filterSettings.newValue) {
    const newSettings = changes.filterSettings.newValue

    hateSpeechEnabled = newSettings.hateSpeech !== undefined ? newSettings.hateSpeech : hateSpeechEnabled
    harassmentEnabled = newSettings.harassment !== undefined ? newSettings.harassment : harassmentEnabled
    profanityEnabled = newSettings.profanity !== undefined ? newSettings.profanity : profanityEnabled
    sensitivity = newSettings.sensitivity !== undefined ? newSettings.sensitivity : sensitivity

    // Rescan with new settings
    if (isShieldEnabled) {
      scanAndProcessComments()
    }
  }
})

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkStatus") {
    sendResponse({
      isShieldEnabled,
      filteredCount,
    })
  } else if (message.action === "forceRescan") {
    // Clear processed nodes cache and rescan
    processedNodes = new WeakSet()
    scanAndProcessComments()
    sendResponse({ success: true })
  }
})

// Initialize on page load
loadSettings()

// Periodically scan for new comments
setInterval(scanAndProcessComments, SCAN_INTERVAL)

// Report that content script is running
console.log("[Bubbl] 🚀 Content script initialized")

