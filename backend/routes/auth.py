"""
Authentication Blueprint
Handles user registration, login, and profile management

Routes:
  POST   /auth/register  - Register a new user (REQUESTER or HELPER)
  POST   /auth/login     - Login and receive JWT access token
  GET    /auth/me        - Get current logged-in user profile [JWT Required]
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
import re

# Import extensions (database, bcrypt, etc.)
from extensions import db, bcrypt

# Import models
from models import User, UserRole

# ============================================================================
# Blueprint Definition
# ============================================================================

# Create Blueprint for authentication routes
# All routes will be prefixed with /api/auth (prefix added in app.py)
bp = Blueprint('auth', __name__, url_prefix='/auth')


# ============================================================================
# Helper Functions
# ============================================================================

def validate_email(email):
    """
    Validate email format using regex.
    
    Args:
        email (str): Email address to validate
    
    Returns:
        bool: True if email format is valid, False otherwise
    """
    # RFC 5322 simplified regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """
    Validate password strength requirements.
    
    Args:
        password (str): Password to validate
    
    Returns:
        tuple: (is_valid, error_message)
    """
    # Check minimum length
    if len(password) < 8:
        return False, 'Password must be at least 8 characters long'
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter'
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False, 'Password must contain at least one digit'
    
    return True, 'Password is valid'


def validate_phone(phone):
    """
    Validate phone number format (basic validation for Bangladesh).
    
    Args:
        phone (str): Phone number to validate
    
    Returns:
        bool: True if phone format is valid, False otherwise
    """
    # Remove spaces and hyphens
    phone = phone.replace(' ', '').replace('-', '')
    
    # Check if it's all digits and between 10-15 digits
    return phone.isdigit() and 10 <= len(phone) <= 15


# ============================================================================
# ROUTE: POST /auth/register
# ============================================================================

@bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user (REQUESTER or HELPER role).
    
    Request Body (JSON):
        - name (str, required): User's full name
        - email (str, required): User's email address (must be unique)
        - password (str, required): User's password (min 8 chars, 1 uppercase,
                                     1 lowercase, 1 digit)
        - role (str, required): User role - 'requester' or 'helper'
        - phone (str, required): User's phone number
        - blood_group (str, optional): Blood group (e.g., 'O+', 'AB-')
        - skills (list, optional): List of skills for helpers
                                    (e.g., ['CPR', 'First Aid'])
    
    Returns:
        JSON: {
            'message': 'User registered successfully',
            'user': {
                'id': int,
                'name': str,
                'email': str,
                'role': str,
                'phone': str,
                'blood_group': str or null,
                'skills': list,
                'created_at': ISO 8601 timestamp
            }
        }, 201
    
    Errors:
        400: Missing required fields, invalid email, weak password, invalid role
        409: Email already exists
    """
    # Step 1: Parse incoming JSON request
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    # Step 2: Extract and validate required fields
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', '').strip().lower()
    phone = data.get('phone', '').strip()
    
    # Step 3: Check for missing required fields
    if not all([name, email, password, role, phone]):
        return jsonify({
            'error': 'Missing required fields',
            'required': ['name', 'email', 'password', 'role', 'phone']
        }), 400
    
    # Step 4: Validate email format
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Step 5: Check if email already exists in database
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Email already registered'}), 409
    
    # Step 6: Validate password strength
    password_valid, password_message = validate_password(password)
    if not password_valid:
        return jsonify({'error': password_message}), 400
    
    # Step 7: Validate role is either 'requester' or 'helper'
    if role not in ['requester', 'helper']:
        return jsonify({
            'error': 'Invalid role',
            'valid_roles': ['requester', 'helper']
        }), 400
    
    # Step 8: Validate phone number format
    if not validate_phone(phone):
        return jsonify({'error': 'Invalid phone number format'}), 400
    
    # Step 9: Extract optional fields
    blood_group = data.get('blood_group', None)
    skills = data.get('skills', [])
    
    # Validate blood group if provided
    if blood_group:
        valid_blood_groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
        if blood_group not in valid_blood_groups:
            return jsonify({
                'error': 'Invalid blood group',
                'valid_groups': valid_blood_groups
            }), 400
    
    # Validate skills is a list
    if not isinstance(skills, list):
        return jsonify({'error': 'Skills must be a list'}), 400
    
    try:
        # Step 10: Create new User instance
        new_user = User(
            name=name,
            email=email,
            role=UserRole.HELPER if role == 'helper' else UserRole.REQUESTER,
            phone=phone,
            blood_group=blood_group,
            skills=','.join([str(item).strip() for item in skills if str(item).strip()]) if skills else None
        )
        
        # Step 11: Hash password and set it on user
        new_user.set_password(password)
        
        # Step 12: Add user to database session
        db.session.add(new_user)
        
        # Step 13: Commit transaction to save user
        db.session.commit()
        
        # Step 14: Return success response with user data (NO password hash)
        return jsonify({
            'message': 'User registered successfully',
            'user': new_user.to_dict()
        }), 201
    
    except Exception as e:
        # Step 15: Rollback transaction on error
        db.session.rollback()
        
        # Return error response
        return jsonify({
            'error': 'Registration failed',
            'details': str(e)
        }), 500


# ============================================================================
# ROUTE: POST /auth/login
# ============================================================================

@bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user with email and password, return JWT token.
    
    Request Body (JSON):
        - email (str, required): User's email address
        - password (str, required): User's password
    
    Returns:
        JSON: {
            'message': 'Login successful',
            'access_token': str (JWT token),
            'user': {
                'id': int,
                'name': str,
                'email': str,
                'role': str,
                'phone': str
            }
        }, 200
    
    Errors:
        400: Missing email or password
        401: Invalid email or incorrect password
    """
    # Step 1: Parse incoming JSON request
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    # Step 2: Extract email and password
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    # Step 3: Check for missing required fields
    if not email or not password:
        return jsonify({
            'error': 'Missing required fields',
            'required': ['email', 'password']
        }), 400
    
    # Step 4: Query database for user with matching email
    user = User.query.filter_by(email=email).first()
    
    # Step 5: Check if user exists and password is correct
    # Return 401 for both cases for security (don't reveal if email exists)
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    try:
        # Step 6: Create JWT access token
        # Token expires in 24 hours (can be configured)
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=24)
        )
        
        # Step 7: Return success response with token and user info
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
        # Step 8: Return error response if token generation fails
        return jsonify({
            'error': 'Login failed',
            'details': str(e)
        }), 500


# ============================================================================
# ROUTE: GET /auth/me
# ============================================================================

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Get current logged-in user's profile.
    
    This route requires a valid JWT token in the Authorization header.
    
    Authorization:
        Header: Authorization: Bearer <JWT_TOKEN>
    
    Returns:
        JSON: {
            'user': {
                'id': int,
                'name': str,
                'email': str,
                'role': str,
                'phone': str,
                'blood_group': str or null,
                'skills': list,
                'is_available': bool,
                'created_at': ISO 8601 timestamp
            }
        }, 200
    
    Errors:
        401: Invalid or missing JWT token
        404: User not found (token is valid but user was deleted)
    """
    # Step 1: Extract user ID from JWT token
    # The jwt_required() decorator ensures only valid tokens reach here
    user_id = get_jwt_identity()
    
    # Step 2: Query database for user with matching ID
    user = User.query.get(user_id)
    
    # Step 3: Check if user exists
    if not user:
        return jsonify({
            'error': 'User not found',
            'message': 'The user associated with this token no longer exists'
        }), 404
    
    # Step 4: Return user profile data (complete profile)
    return jsonify({
        'user': user.to_dict()
    }), 200


# ============================================================================
# Optional: Logout endpoint (token blacklisting)
# ============================================================================

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout user by invalidating their JWT token.
    
    Note: Basic implementation returns success. For full logout functionality,
    implement token blacklisting in production (store revoked tokens in cache).
    
    Authorization:
        Header: Authorization: Bearer <JWT_TOKEN>
    
    Returns:
        JSON: {
            'message': 'Logout successful'
        }, 200
    """
    # In a production system, you would:
    # 1. Get the token from the request
    # 2. Add it to a blacklist (Redis, in-memory cache)
    # 3. Check this blacklist in a before_request handler
    
    # For now, just return success message
    return jsonify({
        'message': 'Logout successful'
    }), 200
