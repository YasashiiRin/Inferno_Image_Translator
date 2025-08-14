from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
from PIL import Image
import numpy as np
import requests
from io import BytesIO
import os
from dotenv import load_dotenv
from AIService.LangProceConversion import LanguageProcessingConversion
import logging

# Cấu hình logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
load_dotenv()

# Khởi tạo PaddleOCR với use_textline_orientation
try:
    ocr = PaddleOCR(use_textline_orientation=True, lang='en')  # Sử dụng use_textline_orientation thay vì cls
except Exception as e:
    logger.error(f"Failed to initialize PaddleOCR: {str(e)}")
    raise

lp = LanguageProcessingConversion()


@app.route('/translate-image', methods=['POST'])
def translate_image():
    try:
        data = request.get_json()
        img_url = data.get('imageUrl')
        if not img_url:
            return jsonify({"success": False, "error": "No imageUrl provided"})

        if img_url.lower().endswith(('.svg', '.jpg')):
            return jsonify({"success": False, "error": "SVG files are not supported."})

        print(f"Processing img_url: {img_url}")

        response = requests.get(img_url, timeout=10)
        response.raise_for_status()

        img = Image.open(BytesIO(response.content)).convert("RGB")
        os.makedirs("./data/output", exist_ok=True)

        import time
        output_path = os.path.join("./data/output", f"{int(time.time())}.jpg")
        img.save(output_path)

        if img.width == 0 or img.height == 0:
            raise ValueError("Image dimensions are invalid")
        width = 1024
        height = int(img.height * width / img.width)
        img = img.resize((width, height), Image.Resampling.LANCZOS)  # Sử dụng LANCZOS thay vì mặc định

        img_np = np.array(img)
        logger.info(f"Image resized to {width}x{height}, shape: {img_np.shape}")

        # OCR với predict() thay vì ocr()
        results = ocr.predict(img_np)  # Loại bỏ cls=True
        if not results or not results[0]:
            return jsonify({"success": False, "error": "No text detected"})

        res0 = results[0]  # dict

        rec_texts = res0.get('rec_texts', [])
        rec_scores = res0.get('rec_scores', [])
        rec_polys  = res0.get('rec_polys', [])


        print("=====> rec_texts", rec_texts)

        # Dịch
        translated_texts = lp.translate_text(rec_texts, "vi", "Spy x Family")

        # Kết quả
        translated_results = []
        for text, translated, score, box in zip(rec_texts, translated_texts, rec_scores, rec_polys):
            translated_results.append({
                "en": text,
                "vi": translated,
                "score": float(score),
                "box": box.tolist()
            })

        print("=====> translated_results", translated_results)
        
        logger.info(f"Translation completed for {img_url}")
        return jsonify({"success": True, "results": translated_results})
    except requests.RequestException as e:
        logger.error(f"Failed to fetch image {img_url}: {str(e)}")
        return jsonify({"success": False, "error": f"Failed to fetch image: {str(e)}"})
    except ValueError as e:
        logger.error(f"Invalid image data for {img_url}: {str(e)}")
        return jsonify({"success": False, "error": str(e)})
    except Exception as e:
        logger.error(f"Error processing {img_url}: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)