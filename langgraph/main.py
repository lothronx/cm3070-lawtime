# ################ Qwen ####################
# import os
# from dotenv import load_dotenv
# from langchain_community.chat_models.tongyi import ChatTongyi

# load_dotenv(".env")

# dashscope_api_key = os.getenv("DASHSCOPE_API_KEY")

# chatLLM = ChatTongyi(model="qwen3-30b-a3b-instruct-2507", api_key=dashscope_api_key)

# msg = chatLLM.invoke("What's 5 times forty two")

# print(msg)

# ################# OCR ####################

# import os
# from dotenv import load_dotenv
# from langchain_community.chat_models.tongyi import ChatTongyi
# from langchain_core.messages import HumanMessage

# load_dotenv(".env")

# dashscope_api_key = os.getenv("DASHSCOPE_API_KEY")

# chatLLM = ChatTongyi(model_name="qwen-vl-ocr", api_key=dashscope_api_key)

# # Try with your original image first, with fallback to working image
# image_urls = [
#     "https://bkimg.cdn.bcebos.com/pic/4a36acaf2edda3cc7b83e2bc03e93901203f92c2?x-bce-process=image/format,f_auto/watermark,image_d2F0ZXIvYmFpa2UyNzI,g_7,xp_5,yp_5,P_20/resize,m_lfit,limit_1,h_1080",
# ]

# for i, image_url in enumerate(image_urls, 1):
#     try:
#         image_message = {"image": image_url}
#         text_message = {
#             "text": "Please output only the text content from the image without any additional descriptions or formatting."
#         }

#         message = HumanMessage(content=[text_message, image_message])
#         response = chatLLM.invoke([message])

#         print(response.content)

#     except Exception as e:
#         print(f"❌ ERROR for Image {i}: {e}")

################# ASR ####################
import os
from dotenv import load_dotenv
from http import HTTPStatus
import dashscope
from dashscope.audio.asr import Transcription
import json
from urllib import request
from typing import List, Dict, Any

load_dotenv(".env")

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")


def extract_transcribed_text(transcription_results: List[Dict[str, Any]]) -> str:
    """
    Extract and concatenate all transcribed text from Dashscope ASR results.

    Args:
        transcription_results: List of ASR result dictionaries from Dashscope

    Returns:
        Concatenated transcribed text from all audio files
    """
    all_texts = []

    for result in transcription_results:
        if "transcripts" in result:
            for transcript in result["transcripts"]:
                if "text" in transcript:
                    text = transcript["text"].strip()
                    if text:  # Only add non-empty text
                        all_texts.append(text)

    # Join with space separator
    return " ".join(all_texts)


task_response = Transcription.async_call(
    model="paraformer-v2",
    file_urls=[
        "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav",
        "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_male2.wav",
    ],
    language_hints=["zh", "en"],
)

transcription_response = dashscope.audio.asr.Transcription.wait(
    task=task_response.output.task_id
)

if transcription_response.status_code == HTTPStatus.OK:
    transcribed_texts = []
    for transcription in transcription_response.output["results"]:
        url = transcription["transcription_url"]
        result = json.loads(request.urlopen(url).read().decode("utf8"))
        transcribed_texts.append(result)

    # Extract just the text
    combined_text = extract_transcribed_text(transcribed_texts)
    print(combined_text)
else:
    print("Error: ", transcription_response.output.message)
