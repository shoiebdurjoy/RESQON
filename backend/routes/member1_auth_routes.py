"""
Member 1 Feature: User Authentication Routes
Handles user registration, login, and profile management.

Routes:
  POST   /auth/register  - Register a new user (REQUESTER or HELPER)
  POST   /auth/login     - Login and receive JWT access token
  GET    /auth/me        - Get current logged-in user profile [JWT Required]
  POST   /auth/logout    - Logout user (token invalidation)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
import re

from extensions import db, bcrypt
from models import User, UserRole

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member1_auth', __name__)


# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def validate_email(email):
    """Validate email format using regex."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validate password strength requirements."""
    if len(password) < 8:
        return False, 'Password must be at least 8 characters long'
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter'
    if not re.search(r'\d', password):
        return False, 'Password must contain at least one digit'
    return True, 'Password is valid'


def validate_phone(phone):
    """Validate phone number format."""
    phone = phone.replace(' ', '').replace('-', '')
    return phone.isdigit() and 10 <= len(phone) <= 15


# ============================================================================
# ROUTE: POST /api/auth/register
# ============================================================================

@bp.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user (REQUESTER or HELPER role)."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    # Extract and validate required fields
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', '').strip().lower()
    phone = data.get('phone', '').strip()
    
    if not all([name, email, password, role, phone]):
        return jsonify({
            'error': 'Missing required fields',
            'required': ['name', 'email', 'password', 'role', 'phone']
        }), 400
    
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Email already registered'}), 409
    
    password_valid, password_message = validate_password(password)
    if not password_valid:
        return jsonify({'error': password_message}), 400
    
    if role not in ['requester', 'helper']:
        return jsonify({
            'error': 'Invalid role',
            'valid_roles': ['requester', 'helper']
        }), 400
    
    if not validate_phone(phone):
        return jsonify({'error': 'Invalid phone number format'}), 400
    
    blood_group = data.get('blood_group', None)
    skills = data.get('skills', [])
    
    if blood_group:
        valid_blood_groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
        if blood_group not in valid_blood_groups:
            return jsonify({
                'error': 'Invalid blood group',
                'valid_groups': valid_blood_groups
            }), 400
    
    if not isinstance(skills, list):
        return jsonify({'error': 'Skills must be a list'}), 400
    
    try:
        new_user = User(
            name=name,
            email=email,
            role=UserRole.HELPER if role == 'helper' else UserRole.REQUESTER,
            phone=phone,
            blood_group=blood_group,
            skills=','.join([str(item).strip() for item in skills if str(item).strip()]) if skills else None
        )
        
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': new_user.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Registration failed',
            'details': str(e)
        }), 500


# ============================================================================
# ROUTE: POST /api/auth/login
# ============================================================================

@bp.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate user with email and password, return JWT token."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({
            'error': 'Missing required fields',
            'required': ['email', 'password']
        }), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    try:
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=24)
        )
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role.value,
                'phone': user.phone
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Login failed',
            'details': str(e)
        }), 500


# ============================================================================
# ROUTE: GET /api/auth/me
# ============================================================================

@bp.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current logged-in user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({
            'error': 'User not found',
            'message': 'The user associated with this token no longer exists'
        }), 404
    
    return jsonify({'user': user.to_dict()}), 200


# ============================================================================
# ROUTE: POST /api/auth/logout
# ============================================================================

@bp.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user by invalidating their JWT token."""
    # In production, implement token blacklisting via Redis or cache
    return jsonify({'message': 'Logout successful'}), 200
