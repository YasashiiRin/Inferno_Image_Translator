console.log("=====> content.js loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkTranslateIcon") {
    const exists = !!document.querySelector(".translateIcon");
    console.log("=====> translateIcon exists?", exists);
    sendResponse({ exists });
  }
  return true;
});

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

  ///handle translate text
  console.log("=====> click toggle enable text at content.js")
  if (request.action === "toggleTranslateText") {
    textEnabled = request.enabled;
    if (textEnabled) {
      translatePage();
    }
  }

  //handle translate convert
  console.log("=====> click toggle enable convert at content.js")
  if (request.action === "toggleTranslateConvert") {
    convertEnabled = request.enabled;
    if (convertEnabled) {
      translateConvert("BNS");
    }
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
    background: "rgba(0, 0, 255, 0.2)"
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
    const width = x2 - x1;
    const height = y2 - y1;

    // blur or hide original text
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";  // background
    ctx.fillRect(x1, y1, width, height);

 
    ctx.strokeStyle = "#FF4500";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, width, height);

    // text background translate
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; 
    ctx.fillRect(x1 + 2, y1 + 2, width - 4, height - 4);
    ctx.fillStyle = "black"; // black
    ctx.font = "16px Noto Sans JP"; // todo
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(result.vi.trim(), x1 + 5, y1 + 5, width - 10); // set text

    // show original text
    if (result.en) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; 
      ctx.fillText(result.en.trim(), x1 + 5, y1 + height - 15, width - 10);
    }
  });
}

async function getImageData(img) {
  try {
    if (img.src.startsWith("blob:")) {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/png");
    }

    else if (img.src.startsWith("data:image/")) {
      return img.src;
    }

    else if (img.src && (img.src.startsWith("http://") || img.src.startsWith("https://"))) {
      const response = await fetch(img.src);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const tempImg = new Image();
      tempImg.src = url;
      await new Promise(resolve => (tempImg.onload = resolve));
      const canvas = document.createElement("canvas");
      canvas.width = tempImg.naturalWidth;
      canvas.height = tempImg.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(tempImg, 0, 0);
      URL.revokeObjectURL(url);
      return canvas.toDataURL("image/png");
    }
  
    else {
      throw new Error("Unsupported image source: " + img.src);
    }
  } catch (error) {
    console.error("Error in getImageData:", error);
    return null; // Trả về null nếu lỗi
  }
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

    
      icon.addEventListener("click", async () => {
        const imageData = await getImageData(img);
        console.log("=====> click icon and show imageData", imageData);
        chrome.runtime.sendMessage(
          { action: "fetchTranslation", imageData},
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
          }
        );
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("=====> DOMContentLoaded");
});


function removeIconsFromImages() {
  const icons = document.querySelectorAll(".translateIcon");
  icons.forEach(icon => icon.remove());
}

async function translatePage() {
  console.log("=====> translatePage HTML");

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parentElement = node.parentElement;
        if (
          parentElement &&
          (parentElement.tagName === 'STYLE' ||
           parentElement.tagName === 'SCRIPT' ||
           parentElement.classList.contains('code-box') ||
           parentElement.closest('.code-box') ||
           parentElement.hasAttribute('style'))
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        // const text = node.nodeValue.trim();
        // if (
        //   !text ||
        //   /[{}\[\];#]/.test(text) ||
        //   /class|def|if|for|print|\b\w{2,4}\b/.test(text) ||
        //   text.split(/\s+/).length < 2 ||
        //   /^,/.test(text) ||
        //   !/[.!?]$/.test(text) ||
        //   /:[a-zA-Z]/.test(text) ||
        //   text.length < 10
        // ) {
        //   console.log(`Rejected text: "${text}"`);
        //   return NodeFilter.FILTER_REJECT;
        // }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  const nodes = [];
  const texts = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.nodeValue.trim();
    if (!text) continue;
    nodes.push(node);
    texts.push(text);
  }

  if (texts.length === 0) {
    console.log("✅ Nothing to translate!");
    return;
  }

  // ---- helper để chia chunk với giới hạn 4000 ký tự và tối đa 10 đoạn
  function chunkTexts(arr, limit = 4000, maxItems = 20) {
    const chunks = [];
    let current = [];
    let currentLength = 0;

    arr.forEach((text, idx) => {
      const item = { idx, text };

      // Kiểm tra độ dài từng đoạn
      if (text.length > limit) {
        console.warn(`Text at index ${idx} exceeds ${limit} characters, splitting:`, text);
        const parts = text.match(new RegExp(`.{1,${limit}}`, "g"));
        parts.forEach((p) => {
          chunks.push([{ idx, text: p }]);
        });
        return;
      }

      // Kiểm tra số lượng đoạn và tổng độ dài
      if (current.length >= maxItems || currentLength + text.length > limit) {
        chunks.push(current);
        current = [item];
        currentLength = text.length;
      } else {
        current.push(item);
        currentLength += text.length;
      }
    });

    if (current.length) chunks.push(current);
    return chunks;
  }

  const chunks = chunkTexts(texts, 4000, 20);

  // kết quả dịch sẽ mapping index gốc
  const translatedMap = {};

  for (const chunk of chunks) {
    const originalTexts = chunk.map((c) => c.text);
    const totalLength = originalTexts.reduce((sum, text) => sum + text.length, 0);
    console.log(`Processing chunk: Texts=${originalTexts}, TotalLength=${totalLength}, Count=${originalTexts.length}`);

    if (totalLength > 4000) {
      console.warn("Chunk exceeds 4000 characters, splitting further:", originalTexts);
      const subChunks = chunkTexts(originalTexts, 4000, 10);
      for (const subChunk of subChunks) {
        const subOriginalTexts = subChunk.map((c) => c.text);
        const subTotalLength = subOriginalTexts.reduce((sum, text) => sum + text.length, 0);
        console.log(`Sub-chunk: Texts=${subOriginalTexts}, TotalLength=${subTotalLength}, Count=${subOriginalTexts.length}`);
        const translations = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: "fetchTranslationText", text: subOriginalTexts },
            (data) => {
              if (!data || !data.success) {
                console.warn("Translation failed, using original text:", subOriginalTexts);
                resolve(subOriginalTexts);
                return;
              }
              resolve(data.results.results || subOriginalTexts);
            }
          );
        });
        subChunk.forEach((c, i) => {
          const originalIdx = chunk.findIndex((item) => item.idx === c.idx);
          translatedMap[chunk[originalIdx].idx] = translations[i] || chunk[originalIdx].text;
        });
      }
    } else {
      const translations = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: "fetchTranslationText", text: originalTexts },
          (data) => {
            if (!data || !data.success) {
              console.warn("Translation failed, using original text:", originalTexts);
              resolve(originalTexts);
              return;
            }
            resolve(data.results.results || originalTexts);
          }
        );
      });
      chunk.forEach((c, i) => {
        translatedMap[c.idx] = translations[i] || c.text;
      });
    }
  }

  nodes.forEach((node, i) => {
    node.nodeValue = translatedMap[i] || texts[i];
  });

  console.log("✅ Page translated!");
}

function translateConvert(type ){
  if (type == "BNS"){
    const html = document.getElementById("noi-dung");

    chrome.runtime.sendMessage(
      { action: "fetchTranslationConvert", text: html.outerHTML},
      (data) => {
        if (!data) {
          sendResponse({ success: false, error: "No response from background" });
          return;
        }
        if (data.success) {
          if (data.results.success == true) {
            console.log("=====> data.results form api convert", data.results)
            const newHtml = data.results.results[0];
            html.innerHTML = newHtml;
          }
        }
      }
    );
  }
}