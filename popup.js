document.addEventListener("DOMContentLoaded", () => {
    // Navbar visibility on scroll
    const navbar = document.getElementById("navbar")
    let lastScrollTop = 0
  
    // Initially hide navbar
    navbar.classList.remove("visible")
  
    // Show navbar on scroll
    document.querySelector(".app-container").addEventListener("scroll", function () {
      const scrollTop = this.scrollTop
  
      // Show navbar after scrolling down a bit
      if (scrollTop > 50) {
        navbar.classList.add("visible")
      } else {
        navbar.classList.remove("visible")
      }
  
      lastScrollTop = scrollTop
    })
  
    // Navigation active state
    const navLinks = document.querySelectorAll(".navbar ul li a")
    const sections = document.querySelectorAll("section")
  
    document.querySelector(".app-container").addEventListener("scroll", function () {
      let current = ""
  
      sections.forEach((section) => {
        const sectionTop = section.offsetTop
        const sectionHeight = section.clientHeight
  
        if (this.scrollTop >= sectionTop - 200) {
          current = section.getAttribute("id")
        }
      })
  
      navLinks.forEach((link) => {
        link.parentElement.classList.remove("active")
        if (link.getAttribute("href") === `#${current}`) {
          link.parentElement.classList.add("active")
        }
      })
    })
  
    // Smooth scrolling for navigation links
    navLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault()
  
        const targetId = this.getAttribute("href").substring(1)
        const targetSection = document.getElementById(targetId)
  
        document.querySelector(".app-container").scrollTo({
          top: targetSection.offsetTop - 70,
          behavior: "smooth",
        })
      })
    })
  
    // Settings functionality
    const sensitivitySlider = document.getElementById("sensitivity")
    const sensitivityValue = document.querySelector(".sensitivity-value")
  
    sensitivitySlider.addEventListener("input", function () {
      sensitivityValue.textContent = this.value
    })
  
    // Save settings button
    document.querySelector(".save-btn").addEventListener("click", () => {
      const settings = {
        hateSpeech: document.getElementById("hate-speech").checked,
        harassment: document.getElementById("harassment").checked,
        profanity: document.getElementById("profanity").checked,
        sensitivity: Number.parseInt(sensitivitySlider.value),
      }
  
      // Save settings to Chrome storage
      chrome.storage.sync.set({ filterSettings: settings }, () => {
        // Show success message
        const saveBtn = document.querySelector(".save-btn")
        const originalText = saveBtn.textContent
  
        saveBtn.textContent = "Settings Saved!"
        saveBtn.style.backgroundColor = "#4CAF50"
  
        setTimeout(() => {
          saveBtn.textContent = originalText
          saveBtn.style.backgroundColor = ""
        }, 2000)
      })
    })
  
    // Load saved settings
    chrome.storage.sync.get("filterSettings", (data) => {
      if (data.filterSettings) {
        document.getElementById("hate-speech").checked = data.filterSettings.hateSpeech
        document.getElementById("harassment").checked = data.filterSettings.harassment
        document.getElementById("profanity").checked = data.filterSettings.profanity
        sensitivitySlider.value = data.filterSettings.sensitivity
        sensitivityValue.textContent = data.filterSettings.sensitivity
      }
    })
  
    // Get elements
    const activeCard = document.getElementById("active-card")
    const inactiveCard = document.getElementById("inactive-card")
    const filteredCountElement = document.getElementById("filtered-count")
  
    // Check if shield is active
    chrome.storage.sync.get(["shieldActive", "filteredCount"], (data) => {
      const isActive = data.shieldActive !== undefined ? data.shieldActive : true
      const filteredCount = data.filteredCount || 3 // Default to 3 if not set
  
      // Update UI based on shield status
      if (isActive) {
        activeCard.style.display = "flex"
        inactiveCard.style.display = "none"
        filteredCountElement.textContent = filteredCount
      } else {
        activeCard.style.display = "none"
        inactiveCard.style.display = "flex"
      }
    })
  
    // Add event listeners to buttons
    const buttons = document.querySelectorAll(".primary-btn")
  
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const buttonText = button.textContent.trim()
  
        if (buttonText === "View Dashboard") {
          // Open dashboard page
          chrome.tabs.create({ url: "dashboard.html" })
        } else if (buttonText === "Go to Bubbl") {
          // Open dashboard page to activate Bubbl
          chrome.tabs.create({ url: "dashboard.html?activate=true" })
        }
      })
    })
  
    // Listen for messages from content script to update filtered count
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "updateFilteredCount") {
        filteredCountElement.textContent = request.count
        chrome.storage.sync.set({ filteredCount: request.count })
      }
    })
  })
  