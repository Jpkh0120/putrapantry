from flask import Blueprint, jsonify, request
from modules.rule_based import get_expiry_alerts
from modules.linear_regression import get_demand_forecast
from modules.gemini_module import chatbot_query, get_restock_recommendations

ai_bp = Blueprint('ai', __name__)

# =========================================================================
# 1. GET /ai/expiry-alerts — Rule-based low stock & expiration system checks
# =========================================================================
@ai_bp.route('/expiry-alerts', methods=['GET'])
def expiry_alerts():
    try:
        result = get_expiry_alerts()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =========================================================================
# 2. GET /ai/demand-forecast — Live Scikit-Learn Regression Forecasting
# =========================================================================
@ai_bp.route('/demand-forecast', methods=['GET'])
def demand_forecast():
    try:
        # Calls the updated module that safely joins real item names onto the labels
        result = get_demand_forecast()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =========================================================================
# 3. GET /ai/restock-suggestions — Hybrid Regression & GenAI Advice
# =========================================================================
@ai_bp.route('/restock-suggestions', methods=['GET'])
def restock_suggestions():
    try:
        forecast = get_demand_forecast()
        gemini_recs = get_restock_recommendations()
        return jsonify({
            'linearRegressionForecasts': forecast,
            'geminiRecommendations': gemini_recs,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =========================================================================
# 4. POST /ai/chatbot — Conversational Assistant with Role-Based Access
# =========================================================================
@ai_bp.route('/chatbot', methods=['POST'])
def chatbot():
    # Gracefully catch missing or non-JSON payloads to prevent runtime crashes
    data = request.get_json(silent=True) or {}
    
    query = data.get('query', '').strip()
    student_id = data.get('studentId')
    role = data.get('role', 'student')  

    if not query:
        return jsonify({'error': 'query field is required'}), 400

    try:
        # Passes the contextual metadata down to your LLM orchestration function
        result = chatbot_query(query, student_id, role)  
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500