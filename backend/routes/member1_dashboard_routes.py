"""
Member 1 Module 3: Interactive Dashboard & Emergency Analytics
Provides global system statistics and analytics summaries.

Routes:
  GET  /api/dashboard/stats     - Total active emergencies, available helpers,
                                   completed requests, and recent activity feed
  GET  /api/analytics/summary   - Most requested type, completion rate,
                                   average response time
"""

from datetime import datetime, timedelta

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from extensions import db
from models import EmergencyRequest, EmergencyStatus, EmergencyType, User, UserRole

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member1_dashboard', __name__)


# ============================================================================
# HELPERS
# ============================================================================

def _seconds_to_minutes(seconds):
    """Convert seconds to a rounded float of minutes."""
    if seconds is None:
        return None
    return round(seconds / 60, 2)


# ============================================================================
# ROUTE: GET /api/dashboard/stats
# ============================================================================

@bp.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def dashboard_stats():
    """
    Return global system statistics for the interactive dashboard.

    Counts:
        - total_active: requests with status PENDING or ACCEPTED
        - available_helpers: helpers whose is_available flag is True
        - completed_requests: requests with status COMPLETED
        - cancelled_requests: requests with status CANCELLED
        - total_requests: all requests ever created

    Recent activity:
        - recent_activities: last 10 requests ordered by creation time (newest first)

    Returns:
        JSON: {
            'stats': {
                'total_active': int,
                'available_helpers': int,
                'completed_requests': int,
                'cancelled_requests': int,
                'total_requests': int
            },
            'recent_activities': [ ...emergency_request_dicts... ]
        }, 200

    Errors:
        500: Database failure
    """
    try:
        total_active = EmergencyRequest.query.filter(
            EmergencyRequest.status.in_([EmergencyStatus.PENDING, EmergencyStatus.ACCEPTED])
        ).count()

        available_helpers = User.query.filter(
            User.role == UserRole.HELPER,
            User.is_available.is_(True)
        ).count()

        completed_requests = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.COMPLETED
        ).count()

        cancelled_requests = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.CANCELLED
        ).count()

        total_requests = EmergencyRequest.query.count()

        # Fetch the 10 most recent requests for the activity feed
        recent = (
            EmergencyRequest.query
            .order_by(EmergencyRequest.created_at.desc())
            .limit(10)
            .all()
        )

        recent_activities = []
        for req in recent:
            recent_activities.append({
                'id': req.id,
                'emergency_type': req.emergency_type.value,
                'urgency_level': req.urgency_level.value,
                'status': req.status.value,
                'requester_name': req.requester.name if req.requester else None,
                'helper_name': req.helper.name if req.helper else None,
                'created_at': req.created_at.isoformat(),
                'description_snippet': (req.description[:80] + '...') if len(req.description) > 80 else req.description,
            })

        return jsonify({
            'stats': {
                'total_active': total_active,
                'available_helpers': available_helpers,
                'completed_requests': completed_requests,
                'cancelled_requests': cancelled_requests,
                'total_requests': total_requests,
            },
            'recent_activities': recent_activities,
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch dashboard stats', 'details': str(e)}), 500


# ============================================================================
# ROUTE: GET /api/analytics/summary
# ============================================================================

@bp.route('/api/analytics/summary', methods=['GET'])
@jwt_required()
def analytics_summary():
    """
    Return system-wide analytics summary.

    Generates:
        - most_requested_type: the EmergencyType with the highest request count
        - type_counts: breakdown of counts per emergency type
        - completion_rate: percentage of non-cancelled requests that are completed
        - avg_response_time_minutes: average minutes from created_at to accepted_at
                                     across all accepted/completed requests

    Returns:
        JSON: {
            'analytics': {
                'most_requested_type': str or null,
                'type_counts': { 'blood': int, 'ambulance': int, 'oxygen': int },
                'completion_rate': float,          # e.g. 72.5  (percent)
                'avg_response_time_minutes': float or null
            }
        }, 200

    Errors:
        500: Database failure
    """
    try:
        # --- Count per emergency type ---
        type_rows = (
            db.session.query(EmergencyRequest.emergency_type, func.count(EmergencyRequest.id))
            .group_by(EmergencyRequest.emergency_type)
            .all()
        )
        type_counts = {et.value: 0 for et in EmergencyType}
        most_requested_type = None
        max_count = 0

        for et, count in type_rows:
            type_counts[et.value] = count
            if count > max_count:
                max_count = count
                most_requested_type = et.value

        # --- Completion rate ---
        # Rate = completed / (completed + cancelled + accepted + pending) excluding only cancelled
        # More intuitive: completed / total_non_cancelled
        total = EmergencyRequest.query.count()
        cancelled = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.CANCELLED
        ).count()
        completed = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.COMPLETED
        ).count()

        non_cancelled = total - cancelled
        completion_rate = round((completed / non_cancelled * 100), 2) if non_cancelled > 0 else 0.0

        # --- Average response time (created_at → accepted_at) ---
        responded = EmergencyRequest.query.filter(
            EmergencyRequest.accepted_at.isnot(None)
        ).all()

        if responded:
            total_seconds = sum(
                (req.accepted_at - req.created_at).total_seconds()
                for req in responded
                if req.accepted_at and req.created_at
            )
            avg_response_time = _seconds_to_minutes(total_seconds / len(responded))
        else:
            avg_response_time = None

        return jsonify({
            'analytics': {
                'most_requested_type': most_requested_type,
                'type_counts': type_counts,
                'completion_rate': completion_rate,
                'avg_response_time_minutes': avg_response_time,
            }
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch analytics summary', 'details': str(e)}), 500
