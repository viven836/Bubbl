

// Bubbl Extension: Advanced toxic content filter
// Improved implementation that works with strict CSP policies

// Throttle function to limit how often a function can be called
function throttle(func, limit) {
  let inThrottle
  return function () {
    const args = arguments
    
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Configuration variables
let isShieldEnabled = true
let hateSpeechEnabled = true
let harassmentEnabled = true
let profanityEnabled = true
let sensitivity = 70 // Default sensitivity (0-100)
let filteredCount = 0 // Track number of filtered comments
let processedNodes = new WeakSet() // Track processed nodes to avoid duplicates
let overlaidNodes = new WeakSet() // Track nodes that already have overlays

// Constants
const SCAN_INTERVAL = 3000 // Increase from 1500ms to 3000ms
const MIN_TEXT_LENGTH = 3 // Minimum text length to process

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
    'article[data-testid="tweet"]', // Twitter tweet article
    'div[data-testid="cellInnerDiv"]', // Twitter cell container
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
    "p.break-words", // Reddit paragraphs
    ".Comment__body p", // Reddit comment paragraphs
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
  "search",
  ".searchbar",
  ".search-bar",
  "menu",
  "sidebar",
  "toolbar",
  "taskbar",
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
  if (!element) return true

  // Skip elements that are too small
  const rect = element.getBoundingClientRect()
  if (rect.width < 40 || rect.height < 15) {
    return true
  }

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
  const formElements = element.querySelectorAll("input, button, select, textarea")
  if (formElements.length > 0) {
    return true
  }

  // Check if element is a link container (but not a comment)
  const links = element.querySelectorAll("a[href]")
  if (links.length > 0 && element.textContent && element.textContent.trim().length < 20) {
    return true
  }

  return false
}

// Check if element is a child of an already processed element
function isChildOfProcessedNode(element) {
  if (!element) return false

  // Check if any parent is already processed
  let parent = element.parentElement
  while (parent) {
    if (processedNodes.has(parent) || overlaidNodes.has(parent) || parent.hasAttribute("data-bubbl-overlay")) {
      return true
    }
    parent = parent.parentElement
  }

  return false
}

// Check if element contains other elements that should be processed separately
function hasProcessableChildren(element) {
  if (!element) return false

  // For Reddit, check if this is a comment container with multiple paragraphs
  if (window.location.hostname.includes("reddit")) {
    const paragraphs = element.querySelectorAll("p")
    if (paragraphs.length > 1) {
      return true
    }
  }

  return false
}

// Replace the patterns object with this more comprehensive set
const patterns = {
  hate_speech: [
    // Original patterns
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

    // Expanded hate speech patterns
    /\b(trash|garbage)\s*(human|person|people)\b/i,
    /\b(go\s*back\s*to\s*your\s*country)\b/i,
    /\b(white|black|asian|latino|hispanic)\s*(supremacy|power)\b/i,
    /\b(jew|muslim|islam|christian|hindu)\s*(hate|hater)\b/i,
    /\b(deport|deportation)\b/i,
    /\b(nazi|fascist|communist)\b/i,
    /\b(libtard|conservatard)\b/i,
    /\b(snowflake)\b/i,
    /\b(sjw)\b/i,
    /\b(triggered)\b/i,
    /\b(woke)\s*(mob|culture|agenda)\b/i,
    /\b(race\s*traitor)\b/i,
    /\b(race\s*card)\b/i,
    /\b(race\s*baiting)\b/i,
    /\b(virtue\s*signal)\b/i,
    /\b(trump|biden|obama)\s*(cult|cultist)\b/i,
    /\b(left|right)\s*(wing|winger)\s*(extremist|radical)\b/i,
    /\b(antifa|proud\s*boys)\b/i,
    /\b(all\s*lives\s*matter)\b/i,
    /\b(blue\s*lives\s*matter)\b/i,
    /\b(illegal\s*alien)\b/i,
    /\b(build\s*the\s*wall)\b/i,
    /\b(lock\s*her\s*up)\b/i,
    /\b(not\s*my\s*president)\b/i,
  ],

  harassment: [
    // Original patterns
    /\b(stupid|idiot|dumb|moron)\b/i,
    /\b(ugly|fat|disgusting)\b/i,
    /\b(kill|die|death|suicide)\b/i,
    /\b(threat|threaten)\b/i,
    /\b(attack|assault)\b/i,
    /\b(bully|bullying)\b/i,
    /\b(harass|harassment)\b/i,
    /\b(loser|pathetic|worthless)\b/i,
    /\bshut up\b/i,
    /\bgo away\b/i,
    /\bnobody cares\b/i,
    /\bnobody asked\b/i,

    // Expanded harassment patterns
    /\b(kys|kill\s*yourself)\b/i,
    /\b(neck\s*yourself)\b/i,
    /\b(hang\s*yourself)\b/i,
    /\b(end\s*yourself)\b/i,
    /\b(off\s*yourself)\b/i,
    /\b(delete\s*yourself)\b/i,
    /\b(delete\s*your\s*account)\b/i,
    /\b(ratio|ratioed)\b/i,
    /\b(clown|bozo)\b/i,
    /\b(incel)\b/i,
    /\b(simp)\b/i,
    /\b(beta|alpha)\s*(male|female)\b/i,
    /\b(soy\s*boy)\b/i,
    /\b(cuck|cuckold)\b/i,
    /\b(karen|chad)\b/i,
    /\b(ok\s*boomer)\b/i,
    /\b(cringe)\b/i,
    /\b(cope|copium)\b/i,
    /\b(seethe)\b/i,
    /\b(malding)\b/i,
    /\b(touch\s*grass)\b/i,
    /\b(get\s*a\s*life)\b/i,
    /\b(cry\s*about\s*it)\b/i,
    /\b(cry\s*more)\b/i,
    /\b(skill\s*issue)\b/i,
    /\b(who\s*asked)\b/i,
    /\b(didn't\s*ask)\b/i,
    /\b(don't\s*care)\b/i,
    /\b(don't\s*care\s*didn't\s*ask)\b/i,
    /\b(you're\s*bad)\b/i,
    /\b(you\s*suck)\b/i,
    /\b(trash\s*player)\b/i,
    /\b(garbage\s*player)\b/i,
    /\b(uninstall)\b/i,
    /\b(get\s*good)\b/i,
    /\b(git\s*gud)\b/i,
    /\b(ez|easy)\b/i,
    /\b(lmao|lol)\s*(bad|trash|garbage)\b/i,
  ],

  profanity: [
    // Original patterns
    /\b(fuck|fucking|fucker|fucked)\b/i,
    /\b(shit|shitty|bullshit|bs)\b/i,
    /\b(ass|asshole)\b/i,
    /\b(bitch|bitches)\b/i,
    /\b(cunt)\b/i,
    /\b(dick|cock|penis)\b/i,
    /\b(pussy|vagina)\b/i,
    /\b(whore|slut)\b/i,
    /\b(damn|goddamn)\b/i,
    /\bcrap\b/i,
    /\bhell\b/i,
    /\bwtf\b/i,
    /\bomg\b/i,

    // Expanded profanity patterns
    /\b(stfu)\b/i,
    /\b(gtfo)\b/i,
    /\b(fk|fck)\b/i,
    /\b(f\*ck|f\*\*k|f\*\*\*)\b/i,
    /\b(s\*\*t|sh\*t)\b/i,
    /\b(b\*tch)\b/i,
    /\b(a\*\*|a\*\*hole)\b/i,
    /\b(c\*nt)\b/i,
    /\b(d\*ck)\b/i,
    /\b(p\*ssy)\b/i,
    /\b(wh\*re|sl\*t)\b/i,
    /\b(ffs)\b/i,
    /\b(af)\b/i,
    /\b(lmfao)\b/i,
    /\b(lmao)\b/i,
    /\b(pos)\b/i,
    /\b(sob)\b/i,
    /\b(tits|titties|boobs)\b/i,
    /\b(milf|dilf)\b/i,
    /\b(thot)\b/i,
    /\b(hoe|ho)\b/i,
    /\b(bastard)\b/i,
    /\b(douche|douchebag)\b/i,
    /\b(jackass)\b/i,
    /\b(piss|pissed)\b/i,
    /\b(screw|screwed)\b/i,
    /\b(jerk)\b/i,
    /\b(darn)\b/i,
    /\b(dang)\b/i,
    /\b(freaking|frickin)\b/i,
    /\b(bloody)\b/i,
    /\b(bollocks)\b/i,
    /\b(bugger)\b/i,
    /\b(wanker)\b/i,
    /\b(tosser)\b/i,
    /\b(twat)\b/i,
    /\b(prick)\b/i,
    /\b(sod)\b/i,
    /\b(git)\b/i,
  ],
}

// Modify the detectToxicContent function to be more aggressive
function detectToxicContent(text) {
  if (!text || typeof text !== "string") return { isToxic: false, categories: [] }

  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase()

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

  // Skip if node is already processed or has an overlay
  if (overlaidNodes.has(node) || node.hasAttribute("data-bubbl-overlay")) {
    return null
  }

  // Skip if node is a child of an already processed node
  if (isChildOfProcessedNode(node)) {
    return null
  }

  // Get node dimensions and position
  const rect = node.getBoundingClientRect()

  // Skip if node is too small or not visible
  if (rect.width < 40 || rect.height < 15 || rect.width === 0 || rect.height === 0) {
    return null
  }

  // Create a unique ID for this overlay
  const overlayId = "bubbl-overlay-" + Math.random().toString(36).substr(2, 9)

  // Mark the node
  node.setAttribute("data-bubbl-overlay", overlayId)
  overlaidNodes.add(node)

  // Determine if this is a short comment (1-2 lines)
  const isShortComment = rect.height < 50 || (node.textContent && node.textContent.length < 100)

  // Create overlay container
  const overlayContainer = document.createElement("div")
  overlayContainer.id = overlayId
  overlayContainer.className = "bubbl-overlay-container"
  overlayContainer.style.position = "relative"
  overlayContainer.style.width = "100%"
  overlayContainer.style.minHeight = "30px"
  overlayContainer.style.margin = "0"
  overlayContainer.style.padding = "0"
  overlayContainer.style.boxSizing = "border-box"
  overlayContainer.style.overflow = "visible"
  overlayContainer.style.zIndex = "9998"

  // Create the blurred content container
  const blurredContent = document.createElement("div")
  blurredContent.className = "bubbl-blurred-content"
  blurredContent.style.position = "relative"
  blurredContent.style.width = "100%"
  blurredContent.style.minHeight = "30px"
  blurredContent.style.filter = "blur(5px)"
  blurredContent.style.userSelect = "none"
  blurredContent.style.pointerEvents = "none"
  blurredContent.style.backgroundColor = "rgba(15, 46, 92, 0.1)"
  blurredContent.style.borderRadius = "4px"
  blurredContent.style.overflow = "hidden"

  // Create the overlay element
  const overlay = document.createElement("div")
  overlay.className = "bubbl-overlay"
  overlay.style.position = "absolute"
  overlay.style.top = "0"
  overlay.style.left = "0"
  overlay.style.width = "100%"
  overlay.style.height = "100%"
  overlay.style.display = "flex"
  overlay.style.alignItems = "center"
  overlay.style.justifyContent = "center"
  overlay.style.backgroundColor = "rgba(123, 95, 201, 0.2)"
  overlay.style.backdropFilter = "blur(2px)"
  overlay.style.zIndex = "9999"
  overlay.style.padding = "5px"
  overlay.style.boxSizing = "border-box"
  overlay.style.textAlign = "center"

  // Create the content for the overlay based on whether it's a short comment or not
  if (isShortComment) {
    // For short comments, use a horizontal layout
    overlay.style.flexDirection = "row"
    overlay.style.justifyContent = "space-between"
    overlay.style.flexWrap = "nowrap"
    overlay.style.minHeight = "30px"

    // Create shield icon
    const shieldIcon = document.createElement("span")
    shieldIcon.className = "bubbl-shield-icon"
    shieldIcon.innerHTML = "🛡️"
    shieldIcon.style.fontSize = "16px"
    shieldIcon.style.marginRight = "5px"
    shieldIcon.style.color = "#ffffff"
    shieldIcon.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)"

    // Create message
    const message = document.createElement("span")
    message.className = "bubbl-message"
    message.textContent = "Potentially harmful content hidden"
    message.style.color = "#ffffff"
    message.style.fontWeight = "500"
    message.style.fontSize = "12px"
    message.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)"
    message.style.flexGrow = "1"
    message.style.whiteSpace = "nowrap"
    message.style.overflow = "hidden"
    message.style.textOverflow = "ellipsis"
    message.style.margin = "0 5px"

    // Create show button
    const showButton = document.createElement("button")
    showButton.className = "bubbl-show-content-btn"
    showButton.textContent = "Show anyway"
    showButton.style.backgroundColor = "#0f2e5c"
    showButton.style.color = "white"
    showButton.style.border = "none"
    showButton.style.borderRadius = "20px"
    showButton.style.padding = "4px 10px"
    showButton.style.fontSize = "11px"
    showButton.style.cursor = "pointer"
    showButton.style.fontFamily = '"Poppins", sans-serif'
    showButton.style.fontWeight = "500"
    showButton.style.whiteSpace = "nowrap"
    showButton.style.flexShrink = "0"
    showButton.style.zIndex = "10000"
    showButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)"

    // Add event listener to show button
    showButton.addEventListener("click", (e) => {
      e.stopPropagation() // Prevent event bubbling
      revealContent(node, overlayContainer)
    })

    // Assemble overlay
    overlay.appendChild(shieldIcon)
    overlay.appendChild(message)
    overlay.appendChild(showButton)
  } else {
    // For longer comments, use a vertical layout
    overlay.style.flexDirection = "column"
    overlay.style.justifyContent = "center"

    // Create message
    const message = document.createElement("div")
    message.className = "bubbl-message"
    message.style.color = "#ffffff"
    message.style.fontWeight = "500"
    message.style.textAlign = "center"
    message.style.marginBottom = "8px"
    message.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)"
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
    showButton.style.zIndex = "10000"
    showButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)"

    // Add event listener to show button
    showButton.addEventListener("click", (e) => {
      e.stopPropagation() // Prevent event bubbling
      revealContent(node, overlayContainer)
    })

    // Assemble overlay
    overlay.appendChild(message)
    overlay.appendChild(showButton)
  }

  // Function to reveal content
  function revealContent(node, container) {
    // Remove the overlay container
    if (container && container.parentNode) {
      // Move the original node back to its original position
      if (node && container.parentNode) {
        container.parentNode.insertBefore(node, container)
      }
      // Remove the overlay container
      container.parentNode.removeChild(container)
    }

    // Remove any blur effect directly on the node
    if (node) {
      node.style.filter = ""
      node.style.userSelect = ""
      node.removeAttribute("data-bubbl-overlay")
    }

    // Log that user viewed the content
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: "contentViewed",
        categories: toxicCategories,
      })
    }
  }

  // Insert the overlay
  if (node.parentNode) {
    // Create the structure
    overlayContainer.appendChild(blurredContent)
    overlayContainer.appendChild(overlay)

    // Insert the overlay container before the node
    node.parentNode.insertBefore(overlayContainer, node)

    // Move the node inside the blurred content container
    blurredContent.appendChild(node)
  }

  // Increment filtered count
  filteredCount++
  console.log(`[Bubbl] 🛡️ Filtered content (${filteredCount} total):`, toxicCategories)

  // Update storage with new count (throttled to avoid quota issues)
  const updateStorage = () => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.sync.get(["filteredCount", "totalFiltered"], (data) => {
        const currentFiltered = Math.max(filteredCount, data.filteredCount || 0)

        chrome.storage.sync.set({ filteredCount: currentFiltered })
        chrome.runtime.sendMessage({
          action: "updateFilteredCount",
          count: currentFiltered,
        })
      })
    } else {
      console.warn("[Bubbl] Chrome storage API not available. Could not update filtered count.")
    }
  }

  // Throttle storage updates to avoid quota issues
  if (filteredCount % 5 === 0) {
    // Only update every 5 filtered items
    updateStorage()
  }

  // Always notify about this specific content being filtered
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.sendMessage({
      action: "contentFiltered",
      categories: toxicCategories,
      url: window.location.href,
    })
  } else {
    console.warn("[Bubbl] Chrome runtime API not available. Could not send contentFiltered message.")
  }

  return overlayContainer
}

// Process text content with pattern-based detection
function processContent(node) {
  // Skip if no content
  if (!node || !node.textContent || node.textContent.trim().length < MIN_TEXT_LENGTH) return

  // Skip UI elements
  if (shouldExcludeElement(node)) return

  // Skip if node is already processed or has an overlay
  if (processedNodes.has(node) || overlaidNodes.has(node) || node.hasAttribute("data-bubbl-overlay")) return

  // Skip if node is a child of an already processed node
  if (isChildOfProcessedNode(node)) return

  // Skip processing if shield is disabled
  if (!isShieldEnabled) return

  try {
    // For Reddit, handle comment containers differently to avoid nested blurring
    if (window.location.hostname.includes("reddit") && hasProcessableChildren(node)) {
      // Process each paragraph separately
      const paragraphs = node.querySelectorAll("p")
      if (paragraphs.length > 0) {
        paragraphs.forEach((paragraph) => {
          if (paragraph.textContent && paragraph.textContent.trim().length >= MIN_TEXT_LENGTH) {
            processContentInternal(paragraph)
          }
        })
        return
      }
    }

    // Process the node normally
    processContentInternal(node)
  } catch (error) {
    console.error("[Bubbl] ❌ Error processing content:", error)
  }
}

// Internal function to process content
function processContentInternal(node) {
  // Skip if already processed
  if (processedNodes.has(node) || overlaidNodes.has(node) || node.hasAttribute("data-bubbl-overlay")) return

  const text = node.textContent.trim()

  // Skip very short text
  if (text.length < MIN_TEXT_LENGTH) return

  // Use pattern-based detection
  const result = detectToxicContent(text)

  // Filter the content if toxic categories were detected
  if (result.isToxic && result.categories.length > 0) {
    console.log(`[Bubbl] 🛡️ Detected toxic content:`, result.categories)
    console.log(`[Bubbl] Text: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`)

    // Mark as processed to avoid duplicate processing
    processedNodes.add(node)

    createBlurredOverlay(node, result.categories)
  } else {
    // For nodes we've checked but aren't toxic, mark them as processed
    // but allow rechecking after some time in case content changes
    processedNodes.add(node)
    setTimeout(() => {
      processedNodes.delete(node)
    }, 30000) // Recheck after 30 seconds
  }
}

// Add this function to handle scroll events for dynamic content loading
function setupScrollListener() {
  const throttledScan = throttle(() => {
    console.log("[Bubbl] 📜 Scanning after scroll event")
    scanAndProcessComments()
  }, 1000)

  window.addEventListener("scroll", throttledScan)
  console.log("[Bubbl] 📜 Optimized scroll listener added")
}

// Modify the scanAndProcessComments function to be more aggressive
function scanAndProcessComments() {
  if (!isShieldEnabled) return

  // Get selectors for the current site
  const selectors = getRelevantSelectors()
  const selectorString = selectors.join(", ")

  try {
    // Find all potential comment nodes
    const commentNodes = document.querySelectorAll(selectorString)
    console.log(`[Bubbl] Found ${commentNodes.length} potential comment nodes`)

    // Process nodes in batches to avoid blocking the main thread
    const processNodesBatch = (nodes, index) => {
      const batchSize = 10
      const end = Math.min(index + batchSize, nodes.length)

      for (let i = index; i < end; i++) {
        const node = nodes[i]
        if (node.textContent && node.textContent.trim().length >= MIN_TEXT_LENGTH) {
          processContent(node)
        }
      }

      if (end < nodes.length) {
        setTimeout(() => processNodesBatch(nodes, end), 50)
      }
    }

    processNodesBatch(Array.from(commentNodes), 0)

    // Also scan paragraphs and text nodes in batches
    const paragraphs = document.querySelectorAll("p, div > span, article, section")

    setTimeout(() => {
      processNodesBatch(
        Array.from(paragraphs).filter(
          (node) =>
            node.textContent && node.textContent.trim().length >= MIN_TEXT_LENGTH && !shouldExcludeElement(node),
        ),
        0,
      )
    }, 300)
  } catch (error) {
    console.error("[Bubbl] ❌ Error scanning comments:", error)
  }
}

// Set up mutation observer to detect new comments
function setupMutationObserver() {
  // Create a mutation observer to watch for new content
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false
    const newNodes = []

    // Use a debounce mechanism to avoid processing too many mutations at once
    if (observer.timeout) {
      clearTimeout(observer.timeout)
    }

    mutations.forEach((mutation) => {
      // Check if nodes were added
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        shouldScan = true

        // Only collect element nodes with sufficient text content
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.textContent &&
            node.textContent.trim().length >= MIN_TEXT_LENGTH
          ) {
            newNodes.push(node)
          }
        })
      }
    })

    // Process new nodes with a delay to avoid blocking the main thread
    if (newNodes.length > 0) {
      observer.timeout = setTimeout(() => {
        console.log(`[Bubbl] Processing ${newNodes.length} newly added nodes`)

        // Process in smaller batches to avoid UI freezing
        const processBatch = (nodes, index) => {
          const batchSize = 5
          const end = Math.min(index + batchSize, nodes.length)

          for (let i = index; i < end; i++) {
            processContent(nodes[i])
          }

          if (end < nodes.length) {
            setTimeout(() => processBatch(nodes, end), 50)
          }
        }

        processBatch(newNodes, 0)
      }, 300)
    }

    // Scan if new nodes were added, but with a delay
    if (shouldScan) {
      observer.timeout = setTimeout(scanAndProcessComments, 500)
    }
  })

  // Start observing the document with more optimized settings
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false, // Don't watch attributes changes
    characterData: false, // Don't watch text content changes
  })

  console.log("[Bubbl] 👀 Optimized mutation observer started")
}

// Modify the forceFullRescan function to be less aggressive
function forceFullRescan() {
  console.log("[Bubbl] 🔄 Forcing full page rescan")

  // Clear processed nodes cache
  processedNodes = new WeakSet()
  overlaidNodes = new WeakSet()

  // Remove existing overlays to prevent duplicates
  const existingOverlays = document.querySelectorAll("[data-bubbl-overlay]")

  // Process in batches
  const processOverlaysBatch = (overlays, index) => {
    const batchSize = 10
    const end = Math.min(index + batchSize, overlays.length)

    for (let i = index; i < end; i++) {
      const node = overlays[i]
      // Remove the data attribute
      node.removeAttribute("data-bubbl-overlay")

      // Remove the blur effect
      node.style.filter = ""
      node.style.userSelect = ""

      // Find and remove the wrapper if it exists
      const wrapper = node.closest(".bubbl-toxic-content-wrapper, .bubbl-overlay-container")
      if (wrapper && wrapper.parentNode) {
        // Move the node outside the wrapper
        wrapper.parentNode.insertBefore(node, wrapper)
        // Remove the wrapper
        wrapper.parentNode.removeChild(wrapper)
      }
    }

    if (end < overlays.length) {
      setTimeout(() => processOverlaysBatch(overlays, end), 50)
    } else {
      // After all overlays are processed, scan for comments with a delay
      setTimeout(scanAndProcessComments, 300)
    }
  }

  processOverlaysBatch(Array.from(existingOverlays), 0)
}

// Modify the loadSettings function to add the scroll listener
function loadSettings() {
  // Declare chrome variable if it's not already defined
  if (typeof chrome === "undefined") {
    chrome = window.chrome
  }

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
      setupScrollListener() // Add scroll listener

      // Set up periodic rescanning
      setInterval(scanAndProcessComments, SCAN_INTERVAL)

      // Additional scan after a delay to catch dynamically loaded content
      setTimeout(scanAndProcessComments, 5000)
      setTimeout(scanAndProcessComments, 10000)
    }
  })
}

// Listen for setting changes
if (typeof chrome !== "undefined" && chrome.storage) {
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
        overlaidNodes = new WeakSet()
        scanAndProcessComments()
      }
    }
  })
} else {
  console.warn("[Bubbl] Chrome storage API not available. Settings will not be updated on changes.")
}

// Add this function to force a complete rescan of the page

// Modify the chrome.runtime.onMessage listener to handle the forceFullRescan action
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkStatus") {
      sendResponse({
        isShieldEnabled,
        filteredCount,
      })
    } else if (message.action === "forceRescan") {
      // Use the new more aggressive rescan
      forceFullRescan()
      sendResponse({ success: true })
    } else if (message.action === "settingsUpdated") {
      // Update settings from dashboard
      if (message.settings) {
        hateSpeechEnabled = message.settings.hateSpeech
        harassmentEnabled = message.settings.harassment
        profanityEnabled = message.settings.profanity
        sensitivity = message.settings.sensitivity * 10 // Convert from 1-10 to 10-100 scale

        console.log("[Bubbl] 🔄 Settings updated from dashboard:", message.settings)

        // Force a full rescan with new settings
        forceFullRescan()
      }
      sendResponse({ success: true })
    } else if (message.action === "toggleShield") {
      // Update shield status
      isShieldEnabled = message.status
      console.log("[Bubbl] Shield toggled:", isShieldEnabled ? "enabled" : "disabled")

      // If shield was enabled, force a full rescan
      if (isShieldEnabled) {
        forceFullRescan()
      }

      sendResponse({ success: true })
    }
  })
} else {
  console.warn("[Bubbl] Chrome runtime API not available. Cannot listen for messages.")
}

// Function to handle page reload detection
function setupPageReloadHandler() {
  // When the page becomes visible (after reload or tab switch)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isShieldEnabled) {
      console.log("[Bubbl] Page became visible, rescanning content")
      setTimeout(() => forceFullRescan(), 1000)
    }
  })

  // When the DOM content is loaded
  document.addEventListener("DOMContentLoaded", () => {
    if (isShieldEnabled) {
      console.log("[Bubbl] DOM content loaded, rescanning content")
      setTimeout(() => forceFullRescan(), 1000)
    }
  })
}

// Add these lines at the end of the file to ensure we scan the page thoroughly
// Initialize on page load
loadSettings()
setupPageReloadHandler()

// Force an initial scan after a short delay to ensure the page is fully loaded
setTimeout(() => {
  console.log("[Bubbl] 🔍 Running initial content scan")
  scanAndProcessComments()
}, 2000)

// Run additional scans at different intervals to catch dynamically loaded content
setTimeout(() => {
  console.log("[Bubbl] 🔍 Running follow-up content scan")
  forceFullRescan()
}, 5000)

setTimeout(() => {
  console.log("[Bubbl] 🔍 Running deep content scan")
  forceFullRescan()
}, 10000)

// Report that content script is running
console.log("[Bubbl] 🚀 Enhanced content script initialized")
