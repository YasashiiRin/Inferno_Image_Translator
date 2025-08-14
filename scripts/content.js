chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translateImage") {
    const img = Array.from(document.querySelectorAll("img")).find(el =>
      el.src === request.url || el.getAttribute("data-src") === request.url
    );

    if (!img) {
      sendResponse({ success: false, error: "Image not found" });
      return;
    }

    chrome.runtime.sendMessage(
      { action: "fetchTranslation", imageUrl: request.url },
      (data) => {
        if (!data) {
          sendResponse({ success: false, error: "No response from background" });
          return;
        }
        if (data.success) {
          displayTranslations(img, data.results);
        }
        sendResponse(data);
      }
    );

    return true; // async
  }
});

function displayTranslations(img, results) {
  console.log("=====> display_translations")
  const oldCanvas = img.parentElement.querySelector(".translateCanvas");
  if (oldCanvas) oldCanvas.remove();

  const rect = img.getBoundingClientRect();
  const scaleX = rect.width / img.naturalWidth;
  const scaleY = rect.height / img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.className = "translateCanvas";
  canvas.style.position = "absolute";
  canvas.style.top = `${rect.top + window.scrollY}px`;
  canvas.style.left = `${rect.left + window.scrollX}px`;
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.zIndex = 9999;
  canvas.style.pointerEvents = "none";

  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  results.forEach(result => {
    const [x1, y1] = [result.box[0][0] * scaleX, result.box[0][1] * scaleY];
    const text = result.vi;

    ctx.font = "16px Arial";
    ctx.textBaseline = "top";

    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(x1, y1, textWidth + 6, 20);

    ctx.fillStyle = "#fff";
    ctx.fillText(text, x1 + 3, y1 + 2);
  });
}
