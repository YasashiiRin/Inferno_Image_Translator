
###
simply an image processing tool with translation and redrawing of translated text onto images
in development
###init env
run command: python -m venv .venv 


### install lib
run commnad: pip install -r requirement.txt


### active env
run command: source .venv/bin/activate

### create env
create file OCR/.env
and paste the content below into the file

GEMINI_API_KEY=AIzaSyBl0BhN_-6dW4Kqqsjn3wmAAUgNnbFx0nQ
ANONYMIZED_TELEMETRY=true
BROWSER_USE_LOGGING_LEVEL=info
IN_DOCKER=false
GOOGLE_APPLICATION_CREDENTIALS= ./google-cloud-key.json

---> to get GEMINI KEY you can access the following link : https://aistudio.google.com/apikey and put it into .env in GEMINI_API_KEY

##run script
run command: python main.py


the image to be translated are all collected in the folde OCR/data/img
the full translation result will be returned in the folder OCR/data/output







