
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // // handle show icon and click 
  console.log("=====> click toggle enable icon at content.js")
  if (request.action === "toggleIcons") {
    iconsEnabled = request.enabled;
    if (iconsEnabled) {
      addHoverIcons();
    } else {
      removeIconsFromImages();
    }
    sendResponse({success: true});
    return true;
  }

  //handle send muti image
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
          console.log("=====> data.results form content.js", data.results)
          if (data.results.success == true && data.results.results.length > 0) {
            displayTranslations(img, data.results);
          }
        }
        sendResponse(data);
      }
    );

    return true; // async
  }
});

function displayTranslations(img, results) {
  console.log("=====> display_translations", { imgSrc: img.src, results });

  if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
    console.warn("Image not loaded yet, waiting...", img.src);
    img.onload = () => displayTranslations(img, results);
    return;
  }


  const ocrResults = Array.isArray(results) ? results : results.results;
  if (!ocrResults || !Array.isArray(ocrResults) || ocrResults.length === 0) {
    console.error("No valid results to draw or empty array:", ocrResults);
    return;
  }


  const oldCanvas = img.parentElement.querySelector(".translateCanvas");
  if (oldCanvas) oldCanvas.remove();


  const rect = img.getBoundingClientRect();
  const scaleX = rect.width / img.naturalWidth;
  const scaleY = rect.height / img.naturalHeight;
  console.log("Rect:", rect, "Natural:", img.naturalWidth, img.naturalHeight, "Scales:", { scaleX, scaleY });


  const canvas = document.createElement("canvas");
  canvas.className = "translateCanvas";
  Object.assign(canvas.style, {
    position: "absolute",
    top: "0",
    left: "0",
    zIndex: "10000",
    pointerEvents: "none",
    background: "rgba(0, 0, 255, 0.2)" // debug
  });
  canvas.width = rect.width;
  canvas.height = rect.height;

  img.parentElement.style.position = "relative";
  img.parentElement.appendChild(canvas);
  const ctx = canvas.getContext("2d");


  ocrResults.forEach((result, index) => {
    console.log(`Processing result[${index}]:`, result);
    if (!result.box || result.box.length !== 4) {
      console.warn(`Invalid box at index ${index}:`, result.box);
      return;
    }

   
    const scaledPoints = result.box.map(([x, y]) => [x * scaleX, y * scaleY]);
    const xs = scaledPoints.map(p => p[0]);
    const ys = scaledPoints.map(p => p[1]);
    const x1 = Math.min(...xs);
    const y1 = Math.min(...ys);
    const x2 = Math.max(...xs);
    const y2 = Math.max(...ys);


    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

    if (result.vi?.trim()) {
      ctx.font = "20px 'Helvetica', Arial, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#00ff00";
      ctx.fillText(result.vi.trim(), x1 + 5, y1 + 2);
    }
  });
}

function addHoverIcons() {
  console.log("=====> addHoverIcons")
  const images = document.querySelectorAll("img");
  images.forEach(img => {

    if (!img.parentElement.classList.contains("translateContainer")) {
      const wrapper = document.createElement("div");
      wrapper.className = "translateContainer";
      wrapper.style.position = "relative";
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
    }

    const wrapper = img.parentElement;

    let icon = wrapper.querySelector(".translateIcon");
    if (!icon) {
      icon = document.createElement("div");
      icon.className = "translateIcon";
      Object.assign(icon.style, {
        position: "absolute",
        top: "5px",
        left: "5px",
        width: "48px",
        height: "48px",
        backgroundImage: `url('${chrome.runtime.getURL("images/inferno128.png")}')`,
        backgroundSize: "contain",
        cursor: "pointer",
        zIndex: 10001,
        display: "none"
      });
      wrapper.appendChild(icon);

      
      wrapper.addEventListener("mouseover", () => {
        icon.style.display = "block";
      });
      wrapper.addEventListener("mouseout", () => {
        icon.style.display = "none";
      });

    
      icon.addEventListener("click", () => {
        chrome.runtime.sendMessage(
          { action: "fetchTranslation", imageUrl: request.url },
          (data) => {
            if (!data) {
              sendResponse({ success: false, error: "No response from background" });
              return;
            }
            if (data.success) {
              console.log("=====> data.results form content.js", data.results)
              if (data.results.success == true && data.results.results.length > 0) {
                displayTranslations(img, data.results);
              }
            }
            sendResponse(data);
          }
        );
      });
    }
  });
}

// document.addEventListener("DOMContentLoaded", addHoverIcons);
// const observer = new MutationObserver((mutations) => {
//   mutations.forEach((mutation) => {
//     if (mutation.addedNodes.length) {
//       addHoverIcons();
//     }
//   });
// });
// observer.observe(document.body, { childList: true, subtree: true });

function removeIconsFromImages() {
  const icons = document.querySelectorAll(".translateIcon");
  icons.forEach(icon => icon.remove());
}