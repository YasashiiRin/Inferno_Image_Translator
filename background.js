
const OCR_URL = "http://192.168.4.217:5000";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateImage",
    title: "Translate Image Text",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateImage" && info.srcUrl) {
    chrome.tabs.sendMessage(tab.id, {
      action: "translateImage",
      url: info.srcUrl
    });
  }
});
let translationQueue = [];
let translationQueueText = [];
let isProcessing = false;
let isProcessingText = false;
async function fetchTranslation(ImageData) {
  console.log("=====> call fetchTranslation", ImageData)
  try {
    const response = await fetch(`${OCR_URL}/translate-image`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ImageData})
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("=====> data response", data)
    return {success: true, results: data};
  } catch (error) {
    console.error("=====> Error when call ORC:", error);
    return {success: false, error: error.toString()};
  }
}
async function fetchTranslationText(text) {
  console.log("=====> call fetchTranslationText", text)
  try {
    const response = await fetch(`${OCR_URL}/translate-text`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text})  
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("=====> data response", data)
    return {success: true, results: data};
  } catch (error) {
    console.error("=====> Error when call ORC:", error);
    return {success: false, error: error.toString()};
  }
}
async function processQueue() {
  console.log("=====> call processQueue")
  if (isProcessing || translationQueue.length === 0) return;
  isProcessing = true;

  const {ImageData, callback} = translationQueue.shift();
  console.log("=====> processQueue imageData", ImageData)
  try {
    const data = await fetchTranslation(ImageData);
    callback(data);
  } catch (error) {
    console.error("=====> Error when process translation:", error);
    callback({success: false, error: error.toString()});
  } finally {
    isProcessing = false;
    processQueue();
  }
  
}
async function processQueueText() {
  console.log("=====> call processQueue  Text")
  if (isProcessingText || translationQueueText.length === 0) return;
  isProcessing = true;

  const {text, callback} = translationQueueText.shift();
  console.log("=====> processQueue text", text)
  try {
    const data = await fetchTranslationText(text);
    callback(data);
  } catch (error) {
    console.error("=====> Error when process translation:", error);
    callback({success: false, error: error.toString()});
  } finally {
    isProcessingText = false;
    processQueueText();
  }
  
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("=====> call fetch")
  if (message.action === "fetchTranslation") {
    translationQueue.push({ImageData: message.imageData, callback: sendResponse});
    console.log(`Đã thêm ${message.imageData} vào queue. Queue length: ${translationQueue.length}`);
    processQueue();

    return true;
  }

  if (message.action === "fetchTranslationText") {
    translationQueueText.push({text: message.text, callback:sendResponse});
    processQueueText();
    return true;
  }

});