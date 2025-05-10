/*
let model;
let isModelLoaded = false;
let isShieldEnabled = false;
let hateSpeechEnabled = false;
let profanityEnabled = false;
let sensitivity = 50; // 0–100

const TOXICITY_THRESHOLD = () => (sensitivity / 100) * 0.4 + 0.5; // => 0.5 to 0.9

// Load local JS scripts
function loadLocalScript(filePath) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(filePath);
    script.type = "text/javascript";
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(`Failed to load script: ${filePath}`);
    document.head.appendChild(script);
  });
}

// Load and initialize the toxicity model
async function loadToxicityModel() {
  if (isModelLoaded) return;

  try {
    console.log("[AI Shield] ⬇️ Loading local TensorFlow and Toxicity model...");

    await loadLocalScript("libs/tf.min.js");
    await loadLocalScript("libs/toxicity.js");

    // Console spinner animation
    const spinnerFrames = ["⏳", "🕐", "🕑", "🕒", "🕓", "🕔"];
    let frameIndex = 0;
    const spinnerInterval = setInterval(() => {
      console.log(`[AI Shield] ${spinnerFrames[frameIndex++ % spinnerFrames.length]} Initializing toxicity model...`);
    }, 500);

    // Wait until toxicity is available
    await new Promise((resolve, reject) => {
      const timeout = 5000;
      const interval = 100;
      let waited = 0;

      const check = () => {
        if (window.toxicity) return resolve();
        waited += interval;
        if (waited >= timeout) return reject("Toxicity model failed to load.");
        setTimeout(check, interval);
      };
      check();
    });

    model = await toxicity.load(TOXICITY_THRESHOLD());
    isModelLoaded = true;
    clearInterval(spinnerInterval);
    console.log("[AI Shield] ✅ Toxicity model loaded successfully!");
  } catch (err) {
    console.error("[AI Shield] ❌ Error loading model:", err);
  }
}

// Evaluate and hide toxic comments
async function processComment(node) {
  const text = node.innerText;
  if (!text || text.trim() === "") return;

  if (!isModelLoaded) await loadToxicityModel();

  model.classify([text]).then((predictions) => {
    let toxicScore = 0;
    predictions.forEach((p) => {
      if (p.results[0].match) toxicScore++;
    });

    if (toxicScore > 0 && isShieldEnabled) {
      node.style.display = "none";
      console.log(`[AI Shield] 🚫 Hiding toxic comment: "${text.slice(0, 60)}..."`);
    }
  });
}

// Scan all comment-like nodes on the page
function scanAndProcessComments() {
  const nodes = document.querySelectorAll("p, span, div, li");
  nodes.forEach((node) => {
    if (!node.hasAttribute("data-checked")) {
      node.setAttribute("data-checked", "true");
      processComment(node);
    }
  });
}

// Settings from storage
chrome.storage.local.get(["isShieldEnabled", "hateSpeechEnabled", "profanityEnabled", "sensitivity"], (data) => {
  isShieldEnabled = data.isShieldEnabled ?? true;
  hateSpeechEnabled = data.hateSpeechEnabled ?? true;
  profanityEnabled = data.profanityEnabled ?? true;
  sensitivity = data.sensitivity ?? 50;

  if (isShieldEnabled) {
    loadToxicityModel().then(() => {
      scanAndProcessComments();
      setInterval(scanAndProcessComments, 2000);
    });
  }
});

// Real-time update listener
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isShieldEnabled) isShieldEnabled = changes.isShieldEnabled.newValue;
  if (changes.hateSpeechEnabled) hateSpeechEnabled = changes.hateSpeechEnabled.newValue;
  if (changes.profanityEnabled) profanityEnabled = changes.profanityEnabled.newValue;
  if (changes.sensitivity) sensitivity = changes.sensitivity.newValue;
});
*/

// content.js — Bubbl Extension: Filters toxic comments using TensorFlow.js Toxicity model

let model;
let isModelLoaded = false;
let isShieldEnabled = true;
let hateSpeechEnabled = true;
let profanityEnabled = true;
let sensitivity = 50; // Default slider value (maps to 0.5)

const TOXICITY_THRESHOLD = () => sensitivity / 100 * 0.4 + 0.5; // maps 0–100 => 0.5–0.9

// Load local JS scripts for TensorFlow and Toxicity model
function loadLocalScript(filePath) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL(filePath);
        script.type = "text/javascript";
        script.async = false;
        script.onload = () => {
            console.log(`[AI Shield] ✅ Loaded script: ${filePath}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`[AI Shield] ❌ Failed to load script: ${filePath}`);
            reject(`Failed to load script: ${filePath}`);
        };
        document.head.appendChild(script);
    });
}

// Load the model from local scripts
/*async function loadToxicityModel() {
    if (isModelLoaded) return;

    try {
        console.log("[AI Shield] ⬇️ Loading local scripts...");

        await loadLocalScript("libs/tf.min.js");
        await loadLocalScript("libs/toxicity.js");

        console.log("[AI Shield] 🧠 Waiting for the toxicity model to initialize...");

        // Wait until `toxicity` is available globally
        await new Promise((resolve, reject) => {
            const maxWait = 5000; // 5 seconds timeout
            const interval = 100;
            let waited = 0;

            const checkToxicity = () => {
                if (window.toxicity) return resolve();
                waited += interval;
                if (waited >= maxWait) return reject("toxicity not defined after timeout");
                setTimeout(checkToxicity, interval);
            };

            checkToxicity();
        });

        // Load the model
        window.toxicity.load(TOXICITY_THRESHOLD()).then(loadedModel => {
            model = loadedModel;
            isModelLoaded = true;
            console.log("[AI Shield] ✅ Toxicity model loaded successfully!");
        });
    } catch (error) {
        console.error("[AI Shield] ❌ Failed to load scripts or model:", error);
    }
}*/

async function loadToxicityModel() {
    if (isModelLoaded) return;

    try {
        console.log("[AI Shield] ⬇️ Loading local scripts...");

        await loadLocalScript("libs/tf.min.js");
        await loadLocalScript("libs/toxicity.js");
        console.log("[AI Shield] 🧠 Waiting for the toxicity model to initialize...");

        if (!window.toxicity || !window.tf) {
        throw new Error("Toxicity or TensorFlow not available after loading."); 
      }

        // ✅ Wait for global `toxicity` to be defined
        let retries = 10;
        while (!window.toxicity && retries > 0) {
            console.log("[AI Shield] ⏳ Waiting for toxicity model to become available...");
            await new Promise(r => setTimeout(r, 500));
            retries--;
        }

        if (!window.toxicity) {
            throw new Error("toxicity model failed to load after retries");
        }

        model = await window.toxicity.load(TOXICITY_THRESHOLD());
        isModelLoaded = true;
        console.log("[AI Shield] ✅ Toxicity model loaded successfully!");

    } catch (error) {
        console.error("[AI Shield] ❌ Failed to load scripts or model:", error);
    }
}


// Remove toxic comments using the AI model
/*async function processComment(commentNode) {
    const text = commentNode.innerText;
    if (!text || text.trim() === "") return;

    if (!isModelLoaded) {
        console.warn("[AI Shield] ❌ Model is not loaded yet.");
        return;
    }

    model.classify([text]).then(predictions => {
        let toxicScore = 0;
        predictions.forEach(pred => {
            if (pred.results[0].match) {
                toxicScore++;
            }
        });

        if (toxicScore > 0 && isShieldEnabled) {
            commentNode.style.display = 'none';
            console.log(`[AI Shield] 🚫 Hidden toxic comment: "${text}"`);
        }
    });
}*/

async function processComment(commentNode) {
    const text = commentNode.innerText;
    if (!text || text.trim() === "") return;

    if (!isModelLoaded || !model || typeof model.classify !== 'function') {
        console.warn("[AI Shield] ⚠️ Model not ready yet.");
        return;
    }

    try {
        const predictions = await model.classify([text]);
        let toxicScore = 0;

        predictions.forEach(pred => {
            if (pred.results[0].match) {
                toxicScore++;
            }
        });

        if (toxicScore > 0 && isShieldEnabled) {
            commentNode.style.display = 'none';
            console.log(`[AI Shield] 🚫 Hidden toxic comment: "${text}"`);
        }

    } catch (err) {
        console.error("[AI Shield] ❌ Error during classification:", err);
    }
}


// Scan and process comments using AI
/*function scanAndProcessComments() {
    const commentNodes = document.querySelectorAll("p, span, div, li");
    commentNodes.forEach(node => {
        if (!node.getAttribute("data-checked")) {
            node.setAttribute("data-checked", "true");
            processComment(node);
        }
    });
}*/

function scanAndProcessComments() {
    if (!isModelLoaded || !model) return;

    const commentNodes = document.querySelectorAll("p, span, div, li");
    commentNodes.forEach(node => {
        if (!node.getAttribute("data-checked")) {
            node.setAttribute("data-checked", "true");
            processComment(node);
        }
    });
}


// Listen for setting changes from popup
chrome.storage.local.get([
    "isShieldEnabled",
    "hateSpeechEnabled",
    "profanityEnabled",
    "sensitivity"
], (data) => {
    isShieldEnabled = data.isShieldEnabled ?? true;
    hateSpeechEnabled = data.hateSpeechEnabled ?? true;
    profanityEnabled = data.profanityEnabled ?? true;
    sensitivity = data.sensitivity ?? 50;

    if (isShieldEnabled) {
        loadToxicityModel().then(() => {
            scanAndProcessComments();
            setInterval(scanAndProcessComments, 2000); // Auto-scan every 2s
        });
    }
});

// Real-time updates from dashboard
chrome.storage.onChanged.addListener((changes) => {
    if (changes.isShieldEnabled) isShieldEnabled = changes.isShieldEnabled.newValue;
    if (changes.hateSpeechEnabled) hateSpeechEnabled = changes.hateSpeechEnabled.newValue;
    if (changes.profanityEnabled) profanityEnabled = changes.profanityEnabled.newValue;
    if (changes.sensitivity) sensitivity = changes.sensitivity.newValue;
});
