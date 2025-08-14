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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchTranslation") {
    fetch("http://192.168.4.191:5000/translate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: message.imageUrl })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("Fetch response:", data);
        sendResponse(data); // Luôn gọi sendResponse
      })
      .catch(err => {
        console.error("Fetch error in background:", err);
        sendResponse({ success: false, error: err.toString() }); // Trả về lỗi
      });

    return true; // Giữ connection cho async
  }
});