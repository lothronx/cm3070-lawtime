# from langgraph_sdk import get_client
# import asyncio

# client = get_client(url="http://localhost:2024")


# async def main():
#     async for chunk in client.runs.stream(
#         None,  # Threadless run
#         "agent",  # Name of assistant. Defined in langgraph.json.
#         input={
#             "messages": [
#                 {
#                     "role": "human",
#                     "content": "What is LangGraph?",
#                 }
#             ],
#         },
#     ):
#         print(f"Receiving new event of type: {chunk.event}...")
#         print(chunk.data)
#         print("\n\n")


# asyncio.run(main())

import os
from dotenv import load_dotenv
from langchain_community.chat_models.tongyi import ChatTongyi

load_dotenv(".env")

dashscope_api_key = os.getenv("DASHSCOPE_API_KEY")

chatLLM = ChatTongyi(model="qwen3-30b-a3b-instruct-2507", api_key=dashscope_api_key)

msg = chatLLM.invoke("What's 5 times forty two")

print(msg)  # print the response
