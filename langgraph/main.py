################ Qwen ####################
import os
from dotenv import load_dotenv
from langchain_community.chat_models.tongyi import ChatTongyi

load_dotenv(".env")

dashscope_api_key = os.getenv("DASHSCOPE_API_KEY")

chatLLM = ChatTongyi(model="qwen3-30b-a3b-instruct-2507", api_key=dashscope_api_key)

msg = chatLLM.invoke("What's 5 times forty two")

print(msg)

################# OCR ####################

import os
from dotenv import load_dotenv
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.messages import HumanMessage

load_dotenv(".env")

dashscope_api_key = os.getenv("DASHSCOPE_API_KEY")

chatLLM = ChatTongyi(model_name="qwen-vl-ocr", api_key=dashscope_api_key)

# Try with your original image first, with fallback to working image
image_urls = [
    "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/summon1.png",
    "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/summon2.jpg",
]

for i, image_url in enumerate(image_urls, 1):
    try:
        image_message = {"image": image_url}
        text_message = {
            "text": "Please output only the text content from the image without any additional descriptions or formatting."
        }

        message = HumanMessage(content=[text_message, image_message])
        response = chatLLM.invoke([message])

        print(response.content)

    except Exception as e:
        print(f"❌ ERROR for Image {i}: {e}")

################# ASR ####################
import os
from dotenv import load_dotenv
from http import HTTPStatus
import dashscope
from dashscope.audio.asr import Transcription
import json

load_dotenv(".env")

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")

task_response = Transcription.async_call(
    model="paraformer-v2",
    file_urls=[
        "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/audio1.m4a"
    ],
    vocabulary_id="",
    disfluency_removal_enabled=True,
)

transcribe_response = Transcription.wait(task=task_response.output.task_id)
if transcribe_response.status_code == HTTPStatus.OK:
    print(json.dumps(transcribe_response.output, indent=4, ensure_ascii=False))
    print("transcription done!")
