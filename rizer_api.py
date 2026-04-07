from gradio_client import Client

# API: https://rohith2006345-rizer-rohith.hf.space
# Correct endpoint name: /ask_rizer
# Input:  question (str)
# Output: rizer_ai_answer (str)

def get_rizer_response(question: str) -> str:
    """
    Calls the Rizer AI Hugging Face Space API and returns the finance answer.
    """
    try:
        client = Client("rohith2006345/rizer-rohith")
        result = client.predict(
            question=question,
            api_name="/ask_rizer"
        )
        return result
    except Exception as e:
        return f"Sorry, I couldn't connect to Rizer AI right now. Error: {str(e)}"
