
// Toggle button
document.getElementById('toggleCheckbox').addEventListener('change', (even) => {
  const isEnabled = even.target.checked;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "toggleIcons", enabled: isEnabled });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  console.log("Popup loaded");
  const translateButton = document.getElementById('translateButton');

  if (translateButton) {
    translateButton.addEventListener('click', () => {
      console.log("Nút Translate All đã được click");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        console.log("Tab hoạt động:", tab.id);

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return Array.from(document.querySelectorAll("img"))
              .map(img => img.src || img.getAttribute('data-src'))
              .filter(src => src && !src.startsWith('data:'));
          },
          world: "ISOLATED" // Chạy trong Isolated World
        }, (results) => {
          if (!results || !results[0] || !Array.isArray(results[0].result)) {
            console.error("No images found or invalid result:", results);
            return;
          }

          const uniqueUrls = [...new Set(results[0].result)];
          console.log("Danh sách ảnh duy nhất:", uniqueUrls);
          
          uniqueUrls.forEach(url => {
            console.log("Sending message for URL:", url);
            chrome.tabs.sendMessage(tab.id, { action: "translateImage", url }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Send message error for", url, ":", chrome.runtime.lastError.message);
              } else if (response) {
                console.log("Response from content script for", url, ":", response);
              } else {
                console.warn("No response from content script for:", url, "- Check content script execution");
              }
            });
          });
        });
      });
    });
  } else {
    console.error("Không tìm thấy nút Translate");
  }
});