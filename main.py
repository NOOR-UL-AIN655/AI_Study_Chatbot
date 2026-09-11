import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not set in the .env file.")
print("Gemini API key loaded:", bool(api_key))

client = genai.Client(api_key=api_key)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Chatbot backend is working!"}


class ChatRequest(BaseModel):
    message: str
    history: list = Field(default_factory=list)


@app.post("/chat")
def chat(request: ChatRequest):
    conversation = ""

    for item in request.history:
          role = item.get("role")
          content = item.get("content")

          if not role or not content:
                 continue
 
          if role == "user":
                conversation += f"Student: {content}\n"
          elif role == "assistant":
                conversation += f"Assistant: {content}\n"
    if not conversation:
           conversation = "No previous conversation. This is a new chat."

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=f"""
            You are an AI Study Assistant.
            Your purpose is to help students learn and understand academic concepts.
            Guidelines:
            - Explain difficult topics in simple, clear language.
            - Give easy examples when useful.
            - When solving problems, explain the steps instead of only giving the final answer.
            - Be friendly, patient, and encouraging.
            - Keep answers focused on the student's question.
            - If the student asks for a short answer, keep the answer short.
            - Only answer questions that are related to studying, education, academic subjects, learning, or educational skills.
            - If the student's question is unrelated to education or learning, politely explain that you are an AI Study Assistant and ask them to ask a study-related question.

            Previous conversation:
            {conversation}
            
            Student's latest message:
            {request.message}

            Now answer the student's latest message."""                
        )

        return {"reply": response.text}

    except Exception as e:
           print("GEMINI ERROR:", repr(e))

    error_message = str(e)

    if "429" in error_message or "RESOURCE_EXHAUSTED" in error_message:
        raise HTTPException(
            status_code=429,
            detail="The AI service is temporarily unavailable because the request limit has been reached. Please try again later."
        )

    raise HTTPException(
        status_code=500,
        detail="Unable to process the request right now."
    )
    