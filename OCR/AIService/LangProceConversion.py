import google.generativeai as genai
import os
from dotenv import load_dotenv
from deep_translator import GoogleTranslator


load_dotenv()

class LanguageProcessingConversion:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel("gemini-1.5-flash")

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

    def translate_texts_google_single(self, texts, dest="vi"):
        result = GoogleTranslator(source='auto', target=dest).translate(texts)
        return result

    def translate_text(self, texts, target_language, prom):
  
        context = f"'{prom}'." if prom else ""
        print("context.....................................", context)
        prompt = (
            f"{context} Translate the following numbered English sentences into {target_language}. "
        )
        print("prompt", prompt)
        response = self.model.generate_content([prompt], stream=False)

        translations = []       

        translations.append(response)
        return translations