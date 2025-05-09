// This script runs on web pages to detect and hide hate comments

// Configuration
let filterSettings = {
    hateSpeech: true,
    harassment: true,
    profanity: true,
    sensitivity: 7,
  }
  
  // Track filtered comments count
  let filteredCount = 0
  
  // Load settings from Chrome storage
  if (typeof chrome !== "undefined" && typeof chrome.storage !== "undefined") {
    chrome.storage.sync.get(["filterSettings", "shieldActive", "filteredCount"], (data) => {
      if (data.filterSettings) {
        filterSettings = data.filterSettings
      }
  
      // Check if shield is active
      const isActive = data.shieldActive !== undefined ? data.shieldActive : true
  
      // Get previously filtered count
      if (data.filteredCount) {
        filteredCount = data.filteredCount
      }
  
      // Only start filtering if shield is active
      if (isActive) {
        startFiltering()
      }
    })
  
    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "sync") {
        if (changes.filterSettings) {
          filterSettings = changes.filterSettings.newValue
        }
  
        if (changes.shieldActive) {
          const isActive = changes.shieldActive.newValue
  
          if (isActive) {
            startFiltering()
          } else {
            // Could implement a way to restore hidden comments here
            console.log("Bubbl shield deactivated")
          }
        }
      }
    })
  } else {
    console.warn("Chrome storage API is not available. Filter settings will not be loaded or saved.")
  }
  
  function startFiltering() {
    // Common selectors for comments across popular platforms
    const commentSelectors = [
      // YouTube
      ".ytd-comment-renderer",
      // Facebook
      ".userContentWrapper",
      // Twitter
      ".tweet-text",
      // Reddit
      ".Comment",
      // Instagram
      ".C4VMK",
      // General
      ".comment",
      ".comments",
      ".comment-body",
    ]
  
    // Simple hate speech detection (would be more sophisticated in a real extension)
    const hatePatterns = [
      /\b(hate|hating)\b/i,
      /\b(stupid|idiot|dumb)\b/i,
      /\b(ugly|fat|disgusting)\b/i,
      /\b(kill|die|death)\b/i,
      /\b(racist|sexist)\b/i,
    ]
  
    // Find all comments on the page
    let comments = []
    commentSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        comments = [...comments, ...elements]
      }
    })
  
    // Process each comment
    comments.forEach((comment) => {
      const commentText = comment.textContent.toLowerCase()
      let hateScore = 0
  
      // Check for hate patterns
      if (filterSettings.hateSpeech) {
        hatePatterns.forEach((pattern) => {
          if (pattern.test(commentText)) {
            hateScore += 2
          }
        })
      }
  
      // Simple profanity check
      if (filterSettings.profanity) {
        const profanityList = ["fuck", "shit", "ass", "bitch", "damn"]
        profanityList.forEach((word) => {
          if (commentText.includes(word)) {
            hateScore += 1
          }
        })
      }
  
      // Adjust score based on sensitivity
      const threshold = 11 - filterSettings.sensitivity
  
      // Hide comment if score exceeds threshold
      if (hateScore >= threshold) {
        // Increment filtered count
        filteredCount++
  
        // Update storage and badge
        if (typeof chrome !== "undefined" && typeof chrome.storage !== "undefined") {
          chrome.storage.sync.set({ filteredCount: filteredCount })
          chrome.runtime.sendMessage({
            action: "updateFilteredCount",
            count: filteredCount,
          })
        }
  
        // Store original content
        const originalContent = comment.innerHTML
  
        // Replace with filtered message
        comment.innerHTML = `
          <div class="bubbl-shield-message" style="
            padding: 10px;
            background-color: #e6f0ff;
            border-radius: 5px;
            color: #0f2e5c;
            font-style: italic;
            text-align: center;
            font-family: 'Poppins', sans-serif;
          ">
            <span>🛡️ Potentially harmful comment hidden by Bubbl</span>
            <button class="show-comment-btn" style="
              background: none;
              border: none;
              color: #4a6cfa;
              text-decoration: underline;
              cursor: pointer;
              font-size: 12px;
              margin-left: 10px;
            ">Show anyway</button>
          </div>
        `
  
        // Add event listener to show button
        const showBtn = comment.querySelector(".show-comment-btn")
        if (showBtn) {
          showBtn.addEventListener("click", () => {
            comment.innerHTML = originalContent
          })
        }
      }
    })
  
    // Set up a mutation observer to catch dynamically loaded comments
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          // Check if any new comments were added
          let newComments = []
          commentSelectors.forEach((selector) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                // Element node
                if (node.matches && node.matches(selector)) {
                  newComments.push(node)
                }
                const childComments = node.querySelectorAll(selector)
                if (childComments.length > 0) {
                  newComments = [...newComments, ...childComments]
                }
              }
            })
          })
  
          // Process new comments
          if (newComments.length > 0) {
            startFiltering()
          }
        }
      })
    })
  
    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }
  