# inference.py
from app import ask_rizer

def predict(question: str) -> str:
    """Entry point for inference used by external tools."""
    return ask_rizer(question)

if __name__ == "__main__":
    print(predict("What is a SIP?"))
