import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify
from backend.config import Config
from backend.database import users_collection
from bson import ObjectId

def hash_password(password: str) -> str:
    """Hash a password using bcrypt and return as a string."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_password(password: str, hashed_password: str) -> bool:
    """Check a plain password against its hashed value."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def generate_token(user_id: str, email: str) -> str:
    """Generate a JWT token with user_id and email payload."""
    payload = {
        'exp': datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRY_HOURS),
        'iat': datetime.now(timezone.utc),
        'sub': user_id,
        'email': email
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')

def token_required(f):
    """Decorator to protect Flask routes, validating the JWT token in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Look for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Authentication token is missing!'}), 401
        
        try:
            # Decode the token
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
            current_user = users_collection.find_one({'_id': ObjectId(data['sub'])})
            if not current_user:
                return jsonify({'message': 'Invalid token - user does not exist!'}), 401
            
            # Remove password field before passing user context
            current_user['_id'] = str(current_user['_id'])
            current_user.pop('password', None)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Authentication token has expired!'}), 401
        except (jwt.InvalidTokenError, Exception) as e:
            return jsonify({'message': 'Authentication token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated
