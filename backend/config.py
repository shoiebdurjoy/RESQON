"""
Flask Application Configuration
Manages development, testing, and production configurations.

Loads all configuration from environment variables using python-dotenv.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================================================================
# BASE CONFIGURATION
# ============================================================================

class Config:
    """Base configuration class for all environments"""
    
    # ---- DATABASE CONFIGURATION ----
    _db_url = os.getenv('DATABASE_URL', 'sqlite:///smart_emergency.db')
    # Render supplies "postgres://" or "postgresql://" — specify psycopg2 driver explicitly
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql+psycopg2://', 1)
    elif _db_url.startswith('postgresql://') and not _db_url.startswith('postgresql+'):
        _db_url = _db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # PostgreSQL connection pool settings
    _engine_options = {
        'pool_pre_ping': True,      # verify connections before checkout
        'pool_recycle': 300,         # recycle connections every 5 min
        'pool_size': 5,
        'max_overflow': 10,
    }
    if 'postgresql' in _db_url:
        _engine_options['connect_args'] = {'connect_timeout': 10}
    SQLALCHEMY_ENGINE_OPTIONS = _engine_options
    
    # ---- JWT (JSON Web Token) CONFIGURATION ----
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production-immediately')
    JWT_ALGORITHM = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # ---- CORS (Cross-Origin Resource Sharing) CONFIGURATION ----
    # Allow Vite frontend (port 5173) to make requests
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization']
    CORS_SUPPORTS_CREDENTIALS = True  # Allow credentials from Vite frontend
    
    # ---- FLASK CONFIGURATION ----
    JSON_SORT_KEYS = False
    PROPAGATE_EXCEPTIONS = True
    
    # ---- SOCKETIO CONFIGURATION ----
    # Use threading for local development on Python 3.14+; eventlet is not required.
    SOCKETIO_ASYNC_MODE = 'threading'
    SOCKETIO_CORS_ALLOWED_ORIGINS = [os.getenv('FRONTEND_URL', 'http://localhost:5173')]
    SOCKETIO_CORS_CREDENTIALS = True
    SOCKETIO_PING_TIMEOUT = 60
    SOCKETIO_PING_INTERVAL = 25
    
    # ---- EXTERNAL API KEYS ----
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')
    TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
    TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
    TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')  # Member 4 Module 3: AI summarisation
    
    # ---- LOGGING ----
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')



# ============================================================================
# DEVELOPMENT CONFIGURATION
# ============================================================================

class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    TESTING = False
    LOG_LEVEL = 'DEBUG'
    SOCKETIO_ASYNC_MODE = 'threading'


# ============================================================================
# TESTING CONFIGURATION
# ============================================================================

class TestingConfig(Config):
    """Testing environment configuration"""
    TESTING = True
    # Use file-based SQLite for testing to avoid PostgreSQL dependency.
    SQLALCHEMY_DATABASE_URI = 'sqlite:///testing.db'
    SQLALCHEMY_ENGINE_OPTIONS = {}   # no pool settings for SQLite
    JWT_SECRET_KEY = 'test-secret-key-do-not-use-in-production'
    SOCKETIO_ASYNC_MODE = 'threading'  # Use threading for tests and local smoke runs


# ============================================================================
# PRODUCTION CONFIGURATION
# ============================================================================

class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    TESTING = False
    LOG_LEVEL = 'WARNING'
    
    # Enforce JWT secret key is set in .env for production
    @classmethod
    def validate(cls):
        if cls.JWT_SECRET_KEY == 'your-secret-key-change-in-production-immediately':
            raise ValueError(
                'JWT_SECRET_KEY must be set via environment variable in production!'
            )


# ============================================================================
# CONFIGURATION DICTIONARY & LOADER
# ============================================================================

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config(config_name=None):
    """
    Get configuration class for the given environment.
    
    Args:
        config_name (str): Configuration name (development, testing, production)
        
    Returns:
        Config: Configuration class for the environment
    """
    config_name = config_name or os.getenv('FLASK_ENV', 'development')
    return config.get(config_name, config['default'])
