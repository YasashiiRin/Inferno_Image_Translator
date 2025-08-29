import google.generativeai as genai
import os
from dotenv import load_dotenv
from deep_translator import GoogleTranslator
from typing import List
load_dotenv()

class LanguageProcessingConversion:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def _is_valid_text(self, text: str) -> bool:
        """Kiểm tra xem text có phải câu hợp lệ không."""
        if not isinstance(text, str) or not text.strip():
            return False
        words = text.strip().split()
        return (
            len(words) >= 2 and
            not text.startswith(',') and
            any(text.endswith(p) for p in '.!?') and
            len(text) <= 5000
        )
    def translate_text_on_image(self, texts, target_language, storyTitle):
  
        numbered_text = "\n".join([f"{i+1}. {t}" for i, t in enumerate(texts)])
        context = f"This dialogue is from a manga titled '{storyTitle}'." if storyTitle else ""
        print("context.....................................", context)
        prompt = (
            f"{context} Translate the following numbered English sentences into {target_language}. "
            "Return only the translations in the same numbered format.\n\n"
            f"{numbered_text}"
        )
        print("prompt", prompt)
        response = self.model.generate_content([prompt], stream=False)

      
        lines = response.text.strip().split("\n")
        translations = []       
        for line in lines:
            if ". " in line:
                translations.append(line.split(". ", 1)[1])
            else:
                translations.append(line)
        return translations

    def translate_texts_google(self, texts, dest="vi"):
        translated_texts = []

        for text in texts:
            result = GoogleTranslator(source='auto', target=dest).translate(text)
            translated_texts.append(result)

        return translated_texts

    def translate_texts_google_single(self, texts: List[str], dest: str = "vi") -> List[str]:
        """Dịch nhiều đoạn bằng GoogleTranslator (xử lý mảng)."""
        if not texts or not isinstance(texts, list):
            return []

        # Lọc và kiểm tra độ dài
        valid_texts = [t for t in texts]
        total_length = sum(len(t) for t in valid_texts)
        if total_length > 5000:
            raise ValueError("Total text length exceeds 5000 characters")

        try:
            translated_texts = []
            for text in valid_texts:
                result = GoogleTranslator(source='auto', target=dest).translate(text)
                translated_texts.append(result)
            return translated_texts
        except Exception as e:
            print(f"Error in translate_texts_google_single: {e}")
            return valid_texts  # Trả về nguyên bản nếu lỗi

    def translate_text(self, texts, target_language):
        prompt = (
            f"The following text was translated from Chinese to Vietnamese, "
            "so some sentences may have unnatural word order or grammar that follows Chinese style. "
            "Your task is to ONLY adjust those sentences that sound unnatural, "
            "to make them fluent Vietnamese, while strictly keeping the original meaning "
            "and preserving all HTML tags. "
            "If a sentence already sounds natural in Vietnamese, leave it unchanged. "
            "Do not add or remove content, do not alter the character's personality or tone. "
            f"Text: {texts}"
        )
        print("prompt", prompt)
        response = self.model.generate_content([prompt], stream=False)
        result_text = response.text if hasattr(response, "text") else str(response)
        translations = []
        translations.append(result_text)
        return translations
