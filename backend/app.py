from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.database import users_collection
from backend.auth import hash_password
from backend.routes.auth import auth_bp
from backend.routes.leads import leads_bp
from backend.routes.analytics import analytics_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for all routes (important for separate frontend/backend deployment)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(leads_bp, url_prefix='/api/leads')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    
    @app.route('/')
    def index():
        return jsonify({
            'status': 'healthy',
            'service': 'Mini CRM API',
            'version': '1.0.0'
        }), 200
        
    # Seed admin user if it doesn't exist
    try:
        if users_collection.count_documents({}) == 0:
            email = Config.ADMIN_EMAIL.lower().strip()
            password = Config.ADMIN_PASSWORD
            hashed_pw = hash_password(password)
            users_collection.insert_one({
                'email': email,
                'password': hashed_pw
            })
            print(f"[*] SEED: Created default administrator account. Email: '{email}', Password: '{password}'")
    except Exception as e:
        print(f"[!] Error seeding default admin user on startup: {e}")
        
    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=Config.PORT, debug=True)
