import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from groq import Groq
from config.firebase import get_db

GROQ_MODEL = 'llama-3.3-70b-versatile'


def _get_client():
    return Groq(api_key=os.getenv('GROQ_API_KEY'))


def _chat(system_prompt: str, user_prompt: str) -> str:
    client = _get_client()
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user',   'content': user_prompt},
            ],
            max_tokens=512,
            temperature=0.7,
        )
        # Debug: print response structure for troubleshooting
        try:
            print('DEBUG: groq response:', repr(response))
        except Exception:
            pass

        # Attempt to read common response fields safely
        try:
            return response.choices[0].message.content.strip()
        except Exception:
            # Fallback: try alternative shapes
            try:
                return response['choices'][0]['message']['content'].strip()
            except Exception as e:
                print('ERROR: Unexpected groq response shape:', repr(response), 'err:', e)
                raise
    except Exception as e:
        print('ERROR: groq _chat failed:', repr(e))
        raise


def _get_current_stock_summary():
    db = get_db()
    docs = db.collection('inventory').stream()
    items = []
    for doc in docs:
        d = doc.to_dict()
        items.append(
            f"- {d.get('itemName')} | qty: {d.get('quantity')} | "
            f"category: {d.get('category')} | expires: {d.get('expiryDate')}"
        )
    return '\n'.join(items) if items else 'No items currently in stock.'


def chatbot_query(query: str, student_id: str = None, role: str = 'student'):
    stock_summary = _get_current_stock_summary()

    if role == 'admin':
        system_prompt = (
            "You are a smart inventory advisor for PutraPantry food bank at UPM. "
            "Help the admin make informed restocking and inventory decisions. "
            "Highlight low stock items, expiring items, and category gaps. "
            "Be data-driven, concise, and actionable. "
            "Keep responses under 200 words."
        )
        user_prompt = (
            f"Current inventory:\n{stock_summary}\n\n"
            f"Admin query: {query}"
        )
    else:
        system_prompt = (
            "You are PutraPantry Assistant, a helpful food bank chatbot at UPM "
            "(Universiti Putra Malaysia). Your role is to help university students "
            "find suitable food from the food bank. Be friendly, concise, and helpful. "
            "Only recommend items that are currently in stock. "
            "Respect any dietary restrictions or preferences the student mentions. "
            "Keep responses under 150 words."
        )
        user_prompt = (
            f"Current available stock:\n{stock_summary}\n\n"
            f"Student query: {query}"
        )

    try:
        reply = _chat(system_prompt, user_prompt)
        return {'reply': reply, 'source': 'groq', 'model': GROQ_MODEL}
    except Exception as e:
        return {
            'reply': 'Sorry, I\'m having trouble connecting right now. Please check the available stock directly.',
            'error': str(e),
        }


def get_restock_recommendations():
    stock_summary = _get_current_stock_summary()

    system_prompt = (
        "You are a food bank inventory advisor for a university food bank. "
        "Provide concise, actionable restocking recommendations for the admin. "
        "Focus on: items running low, items expiring soon, and category gaps. "
        "Format as 3-5 bullet points. Be specific and practical. "
        "Keep the total response under 200 words."
    )
    user_prompt = f"Current inventory:\n{stock_summary}"

    try:
        recommendations = _chat(system_prompt, user_prompt)
        return {'recommendations': recommendations, 'source': 'groq', 'model': GROQ_MODEL}
    except Exception as e:
        return {
            'recommendations': 'Unable to generate recommendations at this time.',
            'error': str(e),
        }