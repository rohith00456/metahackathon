import gradio as gr
import os
import re
import logging

logger = logging.getLogger(__name__)

# ================= API KEYS =================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")

# ================= CONSTANTS =================
MAX_INPUT_LENGTH = 2000

# ================= SYSTEM PROMPT =================
SYSTEM_PROMPT = """You are Rizer AI, an expert personal finance coach for Indian youth aged 13-28.

STRICT RULES:
- Only answer finance-related questions
- Use Indian context (₹, SEBI, RBI, NSE, BSE, mutual funds, SIP)
- Keep answers clear, simple and structured
- SIP always means Systematic Investment Plan (NOT VoIP or anything else)

FORMAT your answers as:
1. Simple definition (1-2 sentences)
2. Key Points (2-3 bullet points)
3. Indian Example (one practical example with ₹)
4. Quick Tip (one actionable advice)

Be friendly, concise and helpful like an elder sibling explaining finance."""

# ================= FINANCE KEYWORD FILTER =================
FINANCE_KEYWORDS = [
    "money","invest","sip","mutual fund","stock","nse","bse","tax",
    "budget","save","fd","upi","bank","credit","loan","insurance",
    "nifty","sensex","sebi","rbi","rupee","finance","salary","wealth",
    "emi","ppf","nps","elss","gold","bond","dividend","return","portfolio",
    "trading","broker","pension","retirement","compound","interest","crypto"
]

def is_finance_question(q):
    # FIX #9: Use word-boundary matching to avoid false positives
    # e.g. "card" no longer matches "discard" or "cardboard"
    return any(re.search(rf'\b{re.escape(w)}\b', q, re.IGNORECASE) for w in FINANCE_KEYWORDS)

def preprocess(question):
    q = question.lower()
    if "sip" in q and "systematic" not in q:
        return question + " (referring to Systematic Investment Plan in mutual funds)"
    return question

# ================= GROQ =================
def ask_groq(question):
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    chat = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question}
        ],
        temperature=0.4,
        top_p=0.9,
        max_tokens=512,
    )
    return chat.choices[0].message.content

# ================= GEMINI =================
def ask_gemini(question):
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    # FIX #5: Use separate system_instruction to prevent prompt injection.
    # Previously the user input was concatenated directly into the system prompt string.
    model = genai.GenerativeModel(
        "gemini-pro",
        system_instruction=SYSTEM_PROMPT
    )
    response = model.generate_content(question)
    return response.text

# ================= HF FALLBACK — strong prompt =================
from transformers import pipeline
from huggingface_hub import login

if HF_TOKEN:
    login(token=HF_TOKEN)

# FIX #10: Lazy-load the HF model. Previously it loaded at import time,
# blocking startup and crashing the app if HF_TOKEN was missing.
_hf_model = None

def get_hf_model():
    global _hf_model
    if _hf_model is None:
        logger.info("Loading HuggingFace model (first request)...")
        _hf_model = pipeline(
            "text-generation",
            model="rohith2006345/rizer-finance-ai",
            token=HF_TOKEN
        )
    return _hf_model

def ask_hf(question):
    hf_model = get_hf_model()
    # Very directive prompt to keep the model on track
    prompt = (
        "You are Rizer AI, a finance coach for Indian youth. "
        "Answer the following finance question clearly and concisely. "
        "Only answer about finance topics.\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )
    result = hf_model(
        prompt,
        max_new_tokens=250,
        temperature=0.3,
        top_p=0.85,
        repetition_penalty=1.3,
        do_sample=True,
        pad_token_id=hf_model.tokenizer.eos_token_id
    )
    raw = result[0]["generated_text"]
    # Extract only the answer after "Answer:"
    if "Answer:" in raw:
        answer = raw.split("Answer:")[-1].strip()
    else:
        answer = raw.strip()
    # Cut off if incomplete sentence (model may trail off)
    sentences = answer.split('. ')
    if len(sentences) > 1 and not answer.endswith('.'):
        answer = '. '.join(sentences[:-1]) + '.'
    return answer

# ================= MAIN FUNCTION =================
def ask_rizer(question):
    if not question.strip():
        return "Please ask a question 😊"

    # FIX #7: Input length validation
    if len(question) > MAX_INPUT_LENGTH:
        return f"Please keep your question under {MAX_INPUT_LENGTH} characters."

    if not is_finance_question(question):
        return "I'm Rizer AI 💰 — I only answer finance questions. Ask me about investing, saving, SIP, stocks, taxes, budgeting, etc.!"

    question = preprocess(question)

    # 1️⃣ GROQ (best quality, free)
    if GROQ_API_KEY:
        try:
            return ask_groq(question)
        except Exception as e:
            print(f"Groq failed: {e}")

    # 2️⃣ GEMINI
    if GEMINI_API_KEY:
        try:
            return ask_gemini(question)
        except Exception as e:
            print(f"Gemini failed: {e}")

    # 3️⃣ HF model fallback
    try:
        return ask_hf(question)
    except Exception as e:
        print(f"HF model failed: {e}")
        return "Sorry, I'm having trouble right now. Please try again in a moment! 💰"


# ================= FASTAPI & GRADIO UI =================
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# FIX #4: Add CORS middleware with explicit origin allowlist.
# Replace the list below with your actual frontend domain(s).
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

@app.post("/reset")
async def reset():
    return {"status": "ok", "message": "Environment reset successful"}

@app.get("/reset")
async def reset_get():
    return {"status": "ok", "message": "Environment reset successful"}

@app.post("/chat")
async def chat_endpoint(request: Request):
    try:
        data = await request.json()
        query = data.get("query", data.get("question", ""))
        answer = ask_rizer(query)
        return {"response": answer}
    except Exception as e:
        # FIX #3: Never leak internal error details to clients
        logger.exception("Chat endpoint error")
        return JSONResponse(status_code=500, content={"error": "Internal server error. Please try again later."})

with gr.Blocks(theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🚀 Rizer AI 💰")
    gr.Markdown("### Your smart personal finance coach for Indian youth 🇮🇳")

    with gr.Row():
        question = gr.Textbox(
            placeholder="Ask about SIP, stocks, saving, tax, mutual funds...",
            label="Your Question"
        )

    with gr.Row():
        submit = gr.Button("Submit 🚀")
        clear = gr.Button("Clear ❌")

    answer = gr.Textbox(label="Rizer AI Answer", lines=10)

    submit.click(ask_rizer, inputs=question, outputs=answer)
    clear.click(lambda: ("", ""), None, [question, answer])

app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)