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
import base64
import re
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
load_dotenv()


lp = LanguageProcessingConversion()

@app.route('/translate-text', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        text = data.get('text', [])
        print("=====> text", text)
        logger.info(f"Received: Texts={text}, Payload length={len(json.dumps(data))}")

        if len(json.dumps(data)) > 5000:
            return jsonify({"success": False, "error": "Total payload exceeds 5000 characters"})
        # translated_texts = lp.translate_text(text, "vi", "Do not lose meaning or distort the content. If the content is in Vietnamese, it may be a converted story (reverse story). You need to rearrange the words to make it similar to a straight story.")
        translated_texts = lp.translate_texts_google_single(text, "vi")
        return jsonify({"success": True, "results": translated_texts})
    except Exception as e:
        print("=====> error", e)
        return jsonify({"success": False, "error": str(e)})

@app.route('/translate-image', methods=['POST'])
def translate_image():
    print("=====> OCR called...")
    try:
        ocr = PaddleOCR(use_textline_orientation=True, lang='en')
        data = request.get_json()
        image_data = data.get('ImageData')

        print("=====> image_data", image_data)

        img = None

        if image_data: 
            base64_data = re.sub('^data:image/.+;base64,', '', image_data)
            img_bytes = base64.b64decode(base64_data)
            img = Image.open(BytesIO(img_bytes)).convert("RGB")
            logger.info("Loaded image from base64 data")
        else:
            return jsonify({"success": False, "error": "No imageUrl or imageData provided"})

        # if img_url.lower().endswith(('.jpg')):
        os.makedirs("./data/output", exist_ok=True)
        import time
        output_path = os.path.join("./data/output", f"{int(time.time())}.jpg")
        # img.save(output_path)

        if img.width == 0 or img.height == 0:
            raise ValueError("Image dimensions are invalid")
        width = 1024
        height = int(img.height * width / img.width)
        img = img.resize((width, height), Image.Resampling.LANCZOS) 

        img_np = np.array(img)
        logger.info(f"Image resized to {width}x{height}, shape: {img_np.shape}")

       
        results = ocr.ocr(img_np) 
        if not results or not results[0]:
            return jsonify({"success": False, "error": "No text detected"})

        res0 = results[0]  # dict

        rec_texts = res0.get('rec_texts', [])
        rec_scores = res0.get('rec_scores', [])
        rec_polys  = res0.get('rec_polys', [])


        print("=====> rec_texts", rec_texts)

        # Dịch
        # translated_texts = lp.translate_text_on_image(rec_texts, "vi", "manga")
        translated_texts = lp.translate_texts_google(rec_texts, "vi")

      
        translated_results = []
        for text, translated, score, box in zip(rec_texts, translated_texts, rec_scores, rec_polys):
            translated_results.append({
                "en": text,
                "vi": translated,
                "score": float(score),
                "box": box.tolist()
            })

        print("=====> translated_results", translated_results)
        
        logger.info(f"Translation completed")
        return jsonify({"success": True, "results": translated_results})
    except requests.RequestException as e:
        logger.error(f"Failed to fetch image: {str(e)}")
        return jsonify({"success": False, "error": f"Failed to fetch image: {str(e)}"})
    except ValueError as e:
        logger.error(f"Invalid image data: {str(e)}")
        return jsonify({"success": False, "error": str(e)})
    except Exception as e:
        logger.error(f"Error processing: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)