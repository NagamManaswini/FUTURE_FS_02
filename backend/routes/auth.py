from flask import Blueprint, request, jsonify
from backend.database import users_collection
from backend.auth import check_password, generate_token, token_required, hash_password

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Admin Login endpoint."""
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'message': 'Email and password are required!'}), 400
        
    user = users_collection.find_one({'email': email.lower().strip()})
    
    if not user or not check_password(password, user['password']):
        return jsonify({'message': 'Invalid email or password!'}), 401
        
    token = generate_token(str(user['_id']), user['email'])
    return jsonify({
        'token': token,
        'user': {
            'email': user['email']
        }
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    """Secure endpoint to update admin password."""
    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'message': 'Old password and new password are required!'}), 400
        
    # Re-fetch user to verify password hash (we didn't store password hash in token_required user context)
    from bson import ObjectId
    user = users_collection.find_one({'_id': ObjectId(current_user['_id'])})
    if not user or not check_password(old_password, user['password']):
        return jsonify({'message': 'Current password is incorrect!'}), 401
        
    # Hash and save the new password
    hashed = hash_password(new_password)
    users_collection.update_one(
        {'_id': ObjectId(current_user['_id'])},
        {'$set': {'password': hashed}}
    )
    return jsonify({'message': 'Password updated successfully!'}), 200
