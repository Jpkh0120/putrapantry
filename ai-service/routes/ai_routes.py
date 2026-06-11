from flask import Blueprint, jsonify, request
from modules.rule_based import get_expiry_alerts
from modules.linear_regression import get_demand_forecast
from modules.gemini_module import chatbot_query, get_restock_recommendations

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/expiry-alerts', methods=['GET'])
def expiry_alerts():
    try:
        result = get_expiry_alerts()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/demand-forecast', methods=['GET'])
def demand_forecast():
    try:
        result = get_demand_forecast()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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


@ai_bp.route('/chatbot', methods=['POST'])
def chatbot():
    data = request.get_json()
    query = data.get('query', '').strip()
    student_id = data.get('studentId')
    role = data.get('role', 'student')  # 👈 add this

    if not query:
        return jsonify({'error': 'query is required'}), 400

    try:
        result = chatbot_query(query, student_id, role)  # 👈 pass role
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
