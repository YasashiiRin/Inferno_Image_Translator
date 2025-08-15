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

async function fetchTranslation(imageUrl) {
  try {
    const response = await fetch("http://192.168.4.194:5000/translate-image", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({imageUrl})
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

  const {imageUrl, callback} = translationQueue.shift();

  try {
    const data = await fetchTranslation(imageUrl);
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
    translationQueue.push({imageUrl: message.imageUrl, callback: sendResponse});
    console.log(`Đã thêm ${message.imageUrl} vào queue. Queue length: ${translationQueue.length}`);
    processQueue();

    return true;
  }
});