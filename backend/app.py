"""
Flask Application Factory
Main entry point for the Smart Emergency Help & Coordination System

This module creates and configures the Flask application with all necessary
extensions, blueprints, and error handlers for a full-featured emergency
coordination API with real-time WebSocket support.
"""

import os
import logging
from flask import Flask, jsonify
from config import config, get_config
from extensions import db, jwt, bcrypt, cors, socketio

# ============================================================================
# APPLICATION FACTORY
# ============================================================================

def create_app(config_name=None):
    """
    Application factory function that creates and configures the Flask app.
    
    Args:
        config_name (str): Configuration environment name
                          (development, testing, production)
    
    Returns:
        Flask: Configured Flask application instance
    
    Raises:
        ValueError: If production config is invalid
    """
    # Determine configuration environment
    config_name = config_name or os.getenv('FLASK_ENV', 'development')
    config_class = get_config(config_name)
    
    # Create Flask app instance
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # ---- Initialize Extensions ----
    
    # SQLAlchemy database
    db.init_app(app)
    
    # JWT authentication
    jwt.init_app(app)
    
    # Bcrypt password hashing
    bcrypt.init_app(app)
    
    # CORS (Cross-Origin Resource Sharing)
    # Allow requests from Vite frontend with credentials
    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": app.config['FRONTEND_URL'],
                "supports_credentials": True,
                "allow_headers": app.config['CORS_ALLOW_HEADERS'],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            }
        }
    )
    
    # SocketIO for real-time communication
    socketio.init_app(
        app,
        cors_allowed_origins=app.config['SOCKETIO_CORS_ALLOWED_ORIGINS'],
        cors_credentials=app.config['SOCKETIO_CORS_CREDENTIALS'],
        async_mode=app.config['SOCKETIO_ASYNC_MODE'],
        ping_timeout=app.config['SOCKETIO_PING_TIMEOUT'],
        ping_interval=app.config['SOCKETIO_PING_INTERVAL'],
    )
    
    # ---- Register Blueprints ----
    
    # Import and register modular API blueprints by member
    # Member 1: Authentication and Emergency Request Creation
    from routes import member1_auth_routes, member1_request_routes
    app.register_blueprint(member1_auth_routes.bp)
    app.register_blueprint(member1_request_routes.bp)
    
    # Member 2: Role-Based Access and Search/Filtering
    from routes import member2_role_routes, member2_filter_routes
    app.register_blueprint(member2_role_routes.bp)
    app.register_blueprint(member2_filter_routes.bp)
    
    # Member 3: Emergency Management and Chat
    from routes import member3_management_routes, member3_chat_routes
    app.register_blueprint(member3_management_routes.bp)
    app.register_blueprint(member3_chat_routes.bp)
    
    # Member 4: History and Notifications
    from routes import member4_misc_routes
    app.register_blueprint(member4_misc_routes.bp)

    # Module 3 Blueprints — one per member
    # Member 1 Module 3: Interactive Dashboard & Emergency Analytics
    from routes import member1_dashboard_routes
    app.register_blueprint(member1_dashboard_routes.bp)

    # Member 2 Module 3: Risk Flagging & Urgency-Based Sorting
    from routes import member2_risk_routes
    app.register_blueprint(member2_risk_routes.bp)

    # Member 3 Module 3: Status Timeline & Trend Tracking
    from routes import member3_timeline_routes
    app.register_blueprint(member3_timeline_routes.bp)

    # Member 4 Module 3: AI Summary (OpenAI) & Performance Metrics
    from routes import member4_ai_routes
    app.register_blueprint(member4_ai_routes.bp)
    
    # Keep original routes for backward compatibility (can be deprecated after migration)
    from routes import auth, emergency, helper, notification
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(emergency.bp, url_prefix='/api/emergency')
    app.register_blueprint(helper.bp, url_prefix='/api/helper')
    app.register_blueprint(notification.bp, url_prefix='/api/notification')
    
    # ---- Register Socket Events ----
    
    # Import and register WebSocket event handlers
    from sockets import events
    events.register_events(socketio)
    
    # ---- JWT Error Handlers ----
    
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """Load user from JWT token payload"""
        from models import User
        user_id = jwt_data.get("sub")
        if not user_id:
            return None
        try:
            return User.query.get(int(user_id))
        except (TypeError, ValueError):
            return None
    
    @jwt.additional_claims_loader
    def add_claims_to_jwt(identity):
        """Add custom claims to JWT token"""
        from models import User, UserRole
        try:
            user = User.query.get(int(identity))
        except (TypeError, ValueError):
            user = None
        if user:
            return {"role": user.role.value}
        return {}
    
    # ---- HTTP Error Handlers ----
    
    @app.errorhandler(400)
    def bad_request(error):
        """
        Handle 400 Bad Request errors.
        
        Returns:
            JSON response with error message and 400 status code
        """
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description) if error.description else 'Invalid request'
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """
        Handle 401 Unauthorized errors (authentication failed).
        
        Returns:
            JSON response with error message and 401 status code
        """
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required. Please provide a valid JWT token.'
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """
        Handle 403 Forbidden errors (authorization failed).
        
        Returns:
            JSON response with error message and 403 status code
        """
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource.'
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """
        Handle 404 Not Found errors (endpoint or resource not found).
        
        Returns:
            JSON response with error message and 404 status code
        """
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource does not exist.'
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """
        Handle 405 Method Not Allowed errors (HTTP method not supported).
        
        Returns:
            JSON response with error message and 405 status code
        """
        return jsonify({
            'error': 'Method Not Allowed',
            'message': f'The {error.request.method} method is not allowed for this endpoint.'
        }), 405
    
    @app.errorhandler(500)
    def internal_error(error):
        """
        Handle 500 Internal Server Error.
        Rollback database transaction to prevent corruption.
        
        Returns:
            JSON response with error message and 500 status code
        """
        db.session.rollback()
        
        # Log the error for debugging
        app.logger.error(f'Internal Server Error: {error}')
        
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred. Our team has been notified.'
        }), 500
    
    # ---- Health Check Endpoint ----
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """
        Health check endpoint for monitoring service availability.
        
        Returns:
            JSON response with service status and version information
        """
        return jsonify({
            'status': 'healthy',
            'service': 'Smart Emergency System API',
            'version': '1.0.0',
            'environment': config_name,
            'database': 'connected' if db.engine.pool.size() > 0 else 'disconnected'
        }), 200
    
    # ---- Debug Information Endpoint ----
    
    @app.route('/api/debug-routes', methods=['GET'])
    def debug_routes():
        """
        Debug endpoint showing all registered routes.
        Only available in development mode.
        
        Returns:
            JSON list of all registered routes and their methods
        """
        if not app.debug:
            return jsonify({'error': 'Not available in production'}), 403
        
        routes = []
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                routes.append({
                    'endpoint': rule.endpoint,
                    'methods': list(rule.methods - {'OPTIONS', 'HEAD'}),
                    'path': str(rule)
                })
        return jsonify({'routes': routes}), 200
    
    # ---- Database Initialization ----
    
    @app.before_request
    def before_request():
        """Initialize database tables before first request"""
        pass
    
    # Create all database tables (graceful error handling if DB is temporarily unreachable)
    with app.app_context():
        try:
            db.create_all()
            app.logger.info(f'Database initialized for {config_name} environment')
        except Exception as e:
            app.logger.error(f'Database initialization failed (verify DATABASE_URL): {e}')
    
    # ---- Logging Configuration ----
    
    if not app.debug:
        # Configure logging for production
        handler = logging.StreamHandler()
        handler.setLevel(app.config['LOG_LEVEL'])
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        )
        handler.setFormatter(formatter)
        app.logger.addHandler(handler)
    
    app.logger.info(f'Flask app initialized: {config_name} environment')
    
    return app


# ============================================================================
# APPLICATION INSTANCE (Exposed for WSGI/Gunicorn: "app:app")
# ============================================================================

app = create_app()


# ============================================================================
# ENTRY POINT (Direct execution: "python app.py")
# ============================================================================

if __name__ == '__main__':
    # Render assigns dynamic port via $PORT. Fallback to FLASK_PORT or 5000.
    server_port = int(os.getenv('PORT', os.getenv('FLASK_PORT', 5000)))
    
    # Run with SocketIO
    socketio.run(
        app,
        host=os.getenv('FLASK_HOST', '0.0.0.0'),
        port=server_port,
        debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true',
        allow_unsafe_werkzeug=True,  # Use with caution in production
    )
