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
let isProcessing = false;

async function fetchTranslation(ImageData) {
  console.log("=====> call fetchTranslation", ImageData)
  try {
    const response = await fetch("http://192.168.4.217:5000/translate-image", {
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("=====> call fetch")
  if (message.action === "fetchTranslation") {
    translationQueue.push({ImageData: message.imageData, callback: sendResponse});
    console.log(`Đã thêm ${message.imageData} vào queue. Queue length: ${translationQueue.length}`);
    processQueue();

    return true;
  }
});