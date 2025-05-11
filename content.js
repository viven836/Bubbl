
/*need this
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

*/



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
  youtube: [
    ".ytd-comment-renderer",
    ".ytd-comment-thread-renderer",
    ".comment-text",
    "#content-text", // YouTube comment text
    ".style-scope.ytd-comment-renderer", // YouTube comment container
  ],
  // Twitter/X
  twitter: [
    '[data-testid="tweetText"]',
    ".tweet-text",
    ".r-1qd0xha",
    '[data-testid="tweet"]', // Twitter tweet container
  ],
  // Reddit
  reddit: [
    ".Comment__body",
    ".RichTextJSON-root",
    ".md",
    ".usertext-body",
    ".Comment", // Reddit comment container
    ".Comment__body-content", // Reddit comment text
    ".RichText", // Reddit rich text
  ],
  // Facebook
  facebook: [
    ".userContent",
    ".commentBody",
    ".UFICommentBody",
    ".x1lliihq", // Facebook comment text
  ],
  // Instagram
  instagram: [
    ".C4VMK",
    "._a9zs",
    ".x1lliihq",
    "._a9zr", // Instagram comment text
  ],
  // General selectors (used across all sites)
  general: [
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

// Excluded selectors - elements we should never blur
const EXCLUDED_SELECTORS = [
  "nav",
  "header",
  ".header",
  ".navbar",
  ".navigation",
  ".search",
  ".searchbar",
  ".search-bar",
  ".menu",
  ".sidebar",
  ".toolbar",
  ".taskbar",
  "input",
  "textarea",
  "button",
  "select",
  ".dropdown",
  ".modal",
  ".dialog",
  ".popup",
  ".tooltip",
  ".notification",
  ".alert",
  ".banner",
  ".ad",
  ".advertisement",
]

// Get all selectors for the current site
function getRelevantSelectors() {
  const hostname = window.location.hostname
  let selectors = [...PLATFORM_SELECTORS.general] // Always include general selectors

  if (hostname.includes("youtube") || hostname.includes("youtu.be")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.youtube]
    console.log("[Bubbl] YouTube detected, using YouTube selectors")
  } else if (hostname.includes("twitter") || hostname.includes("x.com")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.twitter]
    console.log("[Bubbl] Twitter detected, using Twitter selectors")
  } else if (hostname.includes("reddit")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.reddit]
    console.log("[Bubbl] Reddit detected, using Reddit selectors")
  } else if (hostname.includes("facebook")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.facebook]
    console.log("[Bubbl] Facebook detected, using Facebook selectors")
  } else if (hostname.includes("instagram")) {
    selectors = [...selectors, ...PLATFORM_SELECTORS.instagram]
    console.log("[Bubbl] Instagram detected, using Instagram selectors")
  }

  return selectors
}

// Check if an element should be excluded from blurring
function shouldExcludeElement(element) {
  // Check if element matches any excluded selector
  for (const selector of EXCLUDED_SELECTORS) {
    if (element.matches && element.matches(selector)) {
      return true
    }

    // Check if any parent matches excluded selector (up to 5 levels)
    let parent = element.parentElement
    let level = 0
    while (parent && level < 5) {
      if (parent.matches && parent.matches(selector)) {
        return true
      }
      parent = parent.parentElement
      level++
    }
  }

  // Check if element is or contains form elements, navigation, etc.
  const formElements = element.querySelectorAll("input, button, select, textarea, a[href]")
  if (formElements.length > 0) {
    return true
  }

  return false
}

// Simple text-based toxicity detection with more aggressive patterns
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
      // More aggressive patterns
      /\btrump\b.*\bsupport/i, // Example of political content
      /\bbiden\b.*\bsupport/i, // Example of political content
      /\bstupid\b.*\bpeople/i,
      /\bidiot\b.*\bpeople/i,
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
      // More aggressive patterns
      /\bshut up\b/i,
      /\bgo away\b/i,
      /\bnobody cares\b/i,
      /\bnobody asked\b/i,
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
      // More aggressive patterns
      /\bcrap\b/i,
      /\bhell\b/i,
      /\bwtf\b/i,
      /\bomg\b/i,
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
  if (isToxic) {
    // If sensitivity is low (below 30), require multiple matches
    if (sensitivity < 30 && detectedCategories.length < 2) {
      isToxic = false
    }
    // If sensitivity is medium (30-70), one match is enough (default behavior)
    // If sensitivity is high (above 70), even partial matches could trigger
    else if (sensitivity > 70) {
      // For high sensitivity, we'll keep the match
      isToxic = true
    }
  }

  return { isToxic, categories: detectedCategories }
}

// Create a blurred overlay for toxic content
function createBlurredOverlay(node, toxicCategories) {
  // Skip if this is a UI element that shouldn't be blurred
  if (shouldExcludeElement(node)) {
    console.log("[Bubbl] Skipping UI element:", node)
    return null
  }

  // Get node dimensions and position
  const rect = node.getBoundingClientRect()

  // Skip if node is too small or not visible
  if (rect.width < 50 || rect.height < 20 || rect.width === 0 || rect.height === 0) {
    return null
  }

  // Create a unique ID for this overlay
  const overlayId = "bubbl-overlay-" + Math.random().toString(36).substr(2, 9)

  // Check if we already created an overlay for this node
  if (node.hasAttribute("data-bubbl-overlay")) {
    const existingId = node.getAttribute("data-bubbl-overlay")
    const existingOverlay = document.getElementById(existingId)
    if (existingOverlay) {
      return existingOverlay
    }
  }

  // Mark the node
  node.setAttribute("data-bubbl-overlay", overlayId)

  // Create wrapper with relative positioning
  const wrapper = document.createElement("div")
  wrapper.id = overlayId
  wrapper.className = "bubbl-toxic-content-wrapper"
  wrapper.style.position = "relative"
  wrapper.style.width = "100%"
  wrapper.style.height = "100%"
  wrapper.style.overflow = "hidden"
  wrapper.style.borderRadius = "4px"

  // Apply blur to the original content
  node.style.filter = "blur(5px)"
  node.style.userSelect = "none"

  // Create overlay
  const overlay = document.createElement("div")
  overlay.className = "bubbl-toxic-content-overlay"
  overlay.style.position = "absolute"
  overlay.style.top = "0"
  overlay.style.left = "0"
  overlay.style.width = "100%"
  overlay.style.height = "100%"
  overlay.style.backgroundColor = "rgba(123, 95, 201, 0.2)"
  overlay.style.backdropFilter = "blur(2px)"
  overlay.style.display = "flex"
  overlay.style.flexDirection = "column"
  overlay.style.alignItems = "center"
  overlay.style.justifyContent = "center"
  overlay.style.zIndex = "9999"
  overlay.style.fontFamily = '"Poppins", sans-serif'
  overlay.style.padding = "10px"
  overlay.style.boxSizing = "border-box"

  // Create message
  const message = document.createElement("div")
  message.className = "bubbl-message"
  message.style.color = "#ffffff" // White text as requested
  message.style.fontWeight = "500"
  message.style.textAlign = "center"
  message.style.marginBottom = "8px"
  message.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)" // Add shadow for better visibility
  message.innerHTML =
    '<span style="font-size: 16px;">🛡️ Bubbl will keep you safe</span><br><span style="font-size: 12px; opacity: 0.9;">Potentially harmful content hidden</span>'

  // Create show button
  const showButton = document.createElement("button")
  showButton.className = "bubbl-show-content-btn"
  showButton.textContent = "Show anyway"
  showButton.style.backgroundColor = "#0f2e5c"
  showButton.style.color = "white"
  showButton.style.border = "none"
  showButton.style.borderRadius = "20px"
  showButton.style.padding = "6px 14px"
  showButton.style.fontSize = "12px"
  showButton.style.cursor = "pointer"
  showButton.style.fontFamily = '"Poppins", sans-serif'
  showButton.style.fontWeight = "500"
  showButton.style.marginTop = "8px"
  showButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)"

  // Add event listener to show button
  showButton.addEventListener("click", (e) => {
    e.stopPropagation() // Prevent event bubbling

    // Remove the blur effect
    node.style.filter = ""
    node.style.userSelect = ""

    // Hide the overlay
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
  if (node.parentNode) {
    // Insert wrapper before the node
    node.parentNode.insertBefore(wrapper, node)

    // Move the node inside the wrapper
    wrapper.appendChild(node)

    // Add the overlay to the wrapper
    wrapper.appendChild(overlay)
  }

  // Increment filtered count
  filteredCount++
  console.log(`[Bubbl] 🛡️ Filtered content (${filteredCount} total):`, toxicCategories)

  // Update storage with new count (throttled to avoid quota issues)
  const updateStorage = () => {
    chrome.storage.sync.get(["filteredCount", "totalFiltered"], (data) => {
      const currentFiltered = Math.max(filteredCount, data.filteredCount || 0)

      chrome.storage.sync.set({ filteredCount: currentFiltered })
      chrome.runtime.sendMessage({
        action: "updateFilteredCount",
        count: currentFiltered,
      })
    })
  }

  // Throttle storage updates to avoid quota issues
  if (filteredCount % 5 === 0) {
    // Only update every 5 filtered items
    updateStorage()
  }

  // Always notify about this specific content being filtered
  chrome.runtime.sendMessage({
    action: "contentFiltered",
    categories: toxicCategories,
    url: window.location.href,
  })

  return wrapper
}

// Process text content with pattern-based detection
function processContent(node) {
  // Skip if already processed or no content
  if (processedNodes.has(node)) return
  if (!node || !node.textContent || node.textContent.trim().length < 5) return

  // Skip UI elements
  if (shouldExcludeElement(node)) return

  // Mark as processed to avoid duplicate processing
  processedNodes.add(node)

  // Skip processing if shield is disabled
  if (!isShieldEnabled) return

  try {
    const text = node.textContent.trim()

    // Skip very short text
    if (text.length < 5) return

    // Use pattern-based detection
    const result = detectToxicContent(text)

    // Filter the content if toxic categories were detected
    if (result.isToxic && result.categories.length > 0) {
      console.log(`[Bubbl] 🛡️ Detected toxic content:`, result.categories)
      console.log(`[Bubbl] Text: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`)
      createBlurredOverlay(node, result.categories)
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
    console.log(`[Bubbl] Found ${commentNodes.length} potential comment nodes`)

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
  // Check if chrome is defined
  if (typeof chrome === "undefined" || !chrome.storage) {
    console.warn("[Bubbl] Chrome storage API not available. Extension may not function correctly.")
    return
  }

  chrome.storage.sync.get(["shieldActive", "filterSettings", "filteredCount"], (data) => {
    // Set shield status
    isShieldEnabled = data.shieldActive !== undefined ? data.shieldActive : true

    // Get filter settings
    if (data.filterSettings) {
      hateSpeechEnabled = data.filterSettings.hateSpeech !== undefined ? data.filterSettings.hateSpeech : true
      harassmentEnabled = data.filterSettings.harassment !== undefined ? data.filterSettings.harassment : true
      profanityEnabled = data.filterSettings.profanity !== undefined ? data.filterSettings.profanity : true

      // Convert sensitivity from 1-10 scale to 10-100 scale
      sensitivity = data.filterSettings.sensitivity !== undefined ? data.filterSettings.sensitivity * 10 : 70
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

      // Set up periodic rescanning
      setInterval(scanAndProcessComments, SCAN_INTERVAL)
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

    // Convert sensitivity from 1-10 scale to 10-100 scale
    if (newSettings.sensitivity !== undefined) {
      sensitivity = newSettings.sensitivity * 10
    }

    // Rescan with new settings
    if (isShieldEnabled) {
      // Clear processed nodes to recheck everything with new settings
      processedNodes = new WeakSet()
      scanAndProcessComments()
    }
  }
})

// Listen for messages from background script or dashboard
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
  } else if (message.action === "settingsUpdated") {
    // Update settings from dashboard
    if (message.settings) {
      hateSpeechEnabled = message.settings.hateSpeech
      harassmentEnabled = message.settings.harassment
      profanityEnabled = message.settings.profanity
      sensitivity = message.settings.sensitivity * 10 // Convert from 1-10 to 10-100 scale

      console.log("[Bubbl] 🔄 Settings updated from dashboard:", message.settings)

      // Clear processed nodes and rescan with new settings
      processedNodes = new WeakSet()
      scanAndProcessComments()
    }
    sendResponse({ success: true })
  }
})

// Initialize on page load
loadSettings()

// Force an initial scan after a short delay to ensure the page is fully loaded
setTimeout(() => {
  console.log("[Bubbl] 🔍 Running initial content scan")
  scanAndProcessComments()
}, 2000)

// Report that content script is running
console.log("[Bubbl] 🚀 Content script initialized")

