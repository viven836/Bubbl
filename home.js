document.addEventListener("DOMContentLoaded", () => {
    const bubblToggle = document.getElementById("bubblToggle");

    // Check the toggle state on load
    chrome.storage.sync.get("shieldActive", (data) => {
        bubblToggle.checked = data.shieldActive || false;
    });

    // Toggle change event listener
    bubblToggle.addEventListener("change", function () {
        const newStatus = this.checked;
        chrome.storage.sync.set({ shieldActive: newStatus }, () => {
            console.log("Bubbl is " + (newStatus ? "enabled" : "disabled"));
            chrome.runtime.sendMessage({ action: "toggleShield", status: newStatus });
        });
    });

    // Listen for toggle updates from other scripts
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "toggleShield") {
            bubblToggle.checked = request.status;
        }
    });
});
