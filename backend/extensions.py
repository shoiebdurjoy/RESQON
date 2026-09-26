"""
Flask Extensions Initialization
Centralizes all Flask extension initialization to avoid circular imports.

This module initializes all Flask extensions in one place to prevent circular
import issues and provide a single import point for all blueprints and routes.

Extensions initialized:
- SQLAlchemy (db) - Database ORM
- JWTManager (jwt) - JSON Web Token authentication
- Bcrypt (bcrypt) - Password hashing
- CORS (cors) - Cross-Origin Resource Sharing
- SocketIO (socketio) - Real-time WebSocket communication
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_socketio import SocketIO

# ============================================================================
# FLASK EXTENSIONS
# ============================================================================

# SQLAlchemy ORM for database operations
db = SQLAlchemy()

# JWT authentication manager
jwt = JWTManager()

# Bcrypt password hashing
bcrypt = Bcrypt()

# CORS (Cross-Origin Resource Sharing) for API access
cors = CORS()

# SocketIO for real-time WebSocket communication
socketio = SocketIO()


# ============================================================================
# EXPORT
# ============================================================================

__all__ = ['db', 'jwt', 'bcrypt', 'cors', 'socketio']
