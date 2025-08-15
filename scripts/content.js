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


// function displayTranslations(img, results) {
//   console.log("=====> display_translations", { imgSrc: img.src, results: JSON.stringify(results, null, 2) });
//   // Kiểm tra ảnh
//   if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
//     console.error("Image not loaded or invalid:", img.src);
//     return;
//   }

//   // Xóa canvas cũ
//   const oldCanvas = img.parentElement.querySelector(".translateCanvas");
//   if (oldCanvas) oldCanvas.remove();

//   // Lấy kích thước và vị trí ảnh
//   const rect = img.getBoundingClientRect();
//   const scaleX = rect.width / img.naturalWidth;
//   const scaleY = rect.height / img.naturalHeight;
//   console.log("Rect:", rect, "Natural:", img.naturalWidth, img.naturalHeight, "Canvas size:", { width: rect.width, height: rect.height }, "Scales:", { scaleX, scaleY });

//   // Tạo canvas
//   const canvas = document.createElement("canvas");
//   canvas.className = "translateCanvas";
//   canvas.style.position = "absolute";
//   canvas.style.top = "0";
//   canvas.style.left = "0";
//   canvas.width = rect.width;
//   canvas.height = rect.height;
//   canvas.style.zIndex = 10000;
//   canvas.style.pointerEvents = "none";
//   canvas.style.background = "rgba(0, 0, 255, 0.2)"; // Nền xanh nhạt để debug

//   img.parentElement.style.position = "relative";
//   img.parentElement.appendChild(canvas);
//   const ctx = canvas.getContext("2d");

//   // Test vẽ hình chữ nhật và text
//   ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
//   ctx.fillRect(10, 10, 100, 50);
//   ctx.fillStyle = "#ffffff";
//   ctx.fillText("TEST CANVAS", 20, 30);
//   console.log("Test rectangle and text drawn at (10, 10)");

//   // Vẽ các khung và văn bản từ box
//   if (!results || !Array.isArray(results) || results.length === 0) {
//     console.error("No valid results to draw or empty array:", results);
//     return;
//   }

//   results.forEach((result, index) => {
//     console.log(`Processing result[${index}]:`, result);
//     if (!result.box || result.box.length !== 4) {
//       console.warn(`Invalid box at index ${index}:`, result.box);
//       return;
//     }

//     // Log tọa độ gốc từ server
//     console.log(`Original box[${index}]:`, result.box);

//     // Tính tọa độ sau scale
//     const scaledPoints = result.box.map(([x, y]) => [x * scaleX, y * scaleY]);
//     console.log(`Scaled points[${index}]:`, scaledPoints);

//     // Tìm min/max tọa độ để vẽ hình chữ nhật
//     const xs = scaledPoints.map(p => p[0]);
//     const ys = scaledPoints.map(p => p[1]);
//     const x1 = Math.min(...xs);
//     const y1 = Math.min(...ys);
//     const x2 = Math.max(...xs);
//     const y2 = Math.max(...ys);
//     console.log(`Calculated box[${index}]: (${x1}, ${y1}) to (${x2}, ${y2})`);

//     // Vẽ hình chữ nhật
//     ctx.strokeStyle = "yellow";
//     ctx.lineWidth = 2;
//     ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

//     // (Tùy chọn) Điền màu để dễ thấy
//     ctx.fillStyle = "rgba(255, 255, 0, 0.3)"; // Màu vàng nhạt
//     ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

//     // Vẽ văn bản dịch (nếu có)
//     if (result.vi && result.vi.trim() !== '') {
//       ctx.font = "20px 'Helvetica', Arial, sans-serif";
//       ctx.textBaseline = "top";
//       ctx.fillStyle = "#00ff00"; // Văn bản xanh
//       const text = result.vi.trim();
//       const textWidth = ctx.measureText(text).width;
//       const textX = x1 + 5; // Dịch chuyển trong khung
//       const textY = y1 + 2; // Dịch chuyển trong khung
//       console.log(`Drawing text "${text}" at (${textX}, ${textY}) with width ${textWidth}`);
//       ctx.fillText(text, textX, textY);
//     }
//   });
// }


function displayTranslations(img, results) {
  console.log("=====> display_translations", { imgSrc: img.src, results });

  // Nếu ảnh chưa load thì chờ load xong mới vẽ
  if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
    console.warn("Image not loaded yet, waiting...", img.src);
    img.onload = () => displayTranslations(img, results);
    return;
  }

  // Lấy mảng OCR thực sự
  const ocrResults = Array.isArray(results) ? results : results.results;
  if (!ocrResults || !Array.isArray(ocrResults) || ocrResults.length === 0) {
    console.error("No valid results to draw or empty array:", ocrResults);
    return;
  }

  // Xóa canvas cũ
  const oldCanvas = img.parentElement.querySelector(".translateCanvas");
  if (oldCanvas) oldCanvas.remove();

  // Tính tỷ lệ scale
  const rect = img.getBoundingClientRect();
  const scaleX = rect.width / img.naturalWidth;
  const scaleY = rect.height / img.naturalHeight;
  console.log("Rect:", rect, "Natural:", img.naturalWidth, img.naturalHeight, "Scales:", { scaleX, scaleY });

  // Tạo canvas overlay
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

  // Vẽ từng box
  ocrResults.forEach((result, index) => {
    console.log(`Processing result[${index}]:`, result);
    if (!result.box || result.box.length !== 4) {
      console.warn(`Invalid box at index ${index}:`, result.box);
      return;
    }

    // Scale tọa độ
    const scaledPoints = result.box.map(([x, y]) => [x * scaleX, y * scaleY]);
    const xs = scaledPoints.map(p => p[0]);
    const ys = scaledPoints.map(p => p[1]);
    const x1 = Math.min(...xs);
    const y1 = Math.min(...ys);
    const x2 = Math.max(...xs);
    const y2 = Math.max(...ys);

    // Vẽ khung
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // Đổ màu nhẹ để debug
    ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

    // Vẽ text
    if (result.vi?.trim()) {
      ctx.font = "20px 'Helvetica', Arial, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#00ff00";
      ctx.fillText(result.vi.trim(), x1 + 5, y1 + 2);
    }
  });
}
