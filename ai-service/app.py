import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from config.firebase import initialize_firebase
from routes.ai_routes import ai_bp

load_dotenv()

# Initialize Firebase
initialize_firebase()

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    os.getenv("FRONTEND_URL", ""),          # set in Vercel env vars
    os.getenv("BACKEND_URL", ""),           # set in Vercel env vars
])

# Register blueprints
app.register_blueprint(ai_bp, url_prefix='/ai')

@app.route('/health')
def health():
    return {'status': 'ok', 'service': 'putrapantry-ai'}

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    print(f'PutraPantry AI service running on port {port}')
    app.run(host='0.0.0.0', port=port, debug=True)