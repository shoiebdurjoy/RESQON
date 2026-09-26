"""
Member 3 Module 3: Status Timeline & Emergency Type Trend Tracking
Exposes per-request timestamp timelines and aggregate type trend data.

Routes:
  GET  /api/emergency/<id>/timeline  - Creation, acceptance, and completion timestamps
                                        for a single request
  GET  /api/analytics/trends         - Emergency type counts grouped by day (last 30 days)
                                        to identify high-demand resources over time
"""

from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from extensions import db
from models import EmergencyRequest, EmergencyStatus, EmergencyType

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member3_timeline', __name__)


# ============================================================================
# ROUTE: GET /api/emergency/<id>/timeline
# ============================================================================

@bp.route('/api/emergency/<int:request_id>/timeline', methods=['GET'])
@jwt_required()
def get_request_timeline(request_id):
    """
    Return the full status timeline for a single emergency request.

    Each timestamp in the lifecycle is returned along with a human-readable
    label and the elapsed time between stages.

    Path Parameter:
        request_id (int): Primary key of the EmergencyRequest

    Returns:
        JSON: {
            'request_id': int,
            'emergency_type': str,
            'urgency_level': str,
            'current_status': str,
            'timeline': [
                {
                    'stage': str,          # 'created' | 'accepted' | 'completed' | 'cancelled'
                    'timestamp': str,      # ISO 8601 or null
                    'label': str,          # Human-readable stage name
                    'elapsed_minutes': float or null  # Minutes since previous milestone
                },
                ...
            ],
            'total_duration_minutes': float or null  # created_at → completed/cancelled
        }, 200

    Errors:
        404: Request not found
        500: Database failure
    """
    req = EmergencyRequest.query.get(request_id)
    if not req:
        return jsonify({'error': 'Emergency request not found'}), 404

    try:
        def _iso(dt):
            return dt.isoformat() if dt else None

        def _elapsed(start, end):
            """Return elapsed minutes between two datetimes, or None."""
            if not start or not end:
                return None
            s = start.replace(tzinfo=timezone.utc) if start.tzinfo is None else start
            e = end.replace(tzinfo=timezone.utc) if end.tzinfo is None else end
            return round((e - s).total_seconds() / 60, 2)

        # Build ordered timeline stages
        stages = [
            {
                'stage': 'created',
                'timestamp': _iso(req.created_at),
                'label': 'Request Created',
                'elapsed_minutes': None,  # first stage – no prior milestone
            },
            {
                'stage': 'accepted',
                'timestamp': _iso(req.accepted_at),
                'label': 'Helper Accepted',
                'elapsed_minutes': _elapsed(req.created_at, req.accepted_at),
            },
        ]

        # Final stage depends on current status
        if req.status == EmergencyStatus.COMPLETED:
            stages.append({
                'stage': 'completed',
                'timestamp': _iso(req.completed_at),
                'label': 'Request Completed',
                'elapsed_minutes': _elapsed(req.accepted_at or req.created_at, req.completed_at),
            })
        elif req.status == EmergencyStatus.CANCELLED:
            stages.append({
                'stage': 'cancelled',
                'timestamp': _iso(req.completed_at),  # completed_at reused for cancel time
                'label': 'Request Cancelled',
                'elapsed_minutes': _elapsed(req.accepted_at or req.created_at, req.completed_at),
            })
        else:
            # Still in-progress – show current time as a live "now" marker
            now = datetime.now(timezone.utc)
            stages.append({
                'stage': 'in_progress',
                'timestamp': now.isoformat(),
                'label': 'In Progress (Now)',
                'elapsed_minutes': _elapsed(req.accepted_at or req.created_at, now),
            })

        # Total duration: from creation to terminal state (or now if still open)
        end_time = req.completed_at if req.completed_at else datetime.now(timezone.utc)
        total_duration = _elapsed(req.created_at, end_time)

        return jsonify({
            'request_id': req.id,
            'emergency_type': req.emergency_type.value,
            'urgency_level': req.urgency_level.value,
            'current_status': req.status.value,
            'timeline': stages,
            'total_duration_minutes': total_duration,
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch timeline', 'details': str(e)}), 500


# ============================================================================
# ROUTE: GET /api/analytics/trends
# ============================================================================

@bp.route('/api/analytics/trends', methods=['GET'])
@jwt_required()
def get_emergency_trends():
    """
    Return a breakdown of emergency request counts grouped by type and day
    over the last N days (default 30).  Used to identify high-demand
    resource types and track usage patterns over time.

    Query Parameters:
        days (optional, int): Number of past days to include (default 30, max 90)

    Returns:
        JSON: {
            'period_days': int,
            'start_date': str (YYYY-MM-DD),
            'end_date': str (YYYY-MM-DD),
            'trends': {
                'blood':     [ {'date': 'YYYY-MM-DD', 'count': int}, ... ],
                'ambulance': [ {'date': 'YYYY-MM-DD', 'count': int}, ... ],
                'oxygen':    [ {'date': 'YYYY-MM-DD', 'count': int}, ... ]
            },
            'totals': {
                'blood': int,
                'ambulance': int,
                'oxygen': int
            },
            'peak_day': {
                'date': str or null,
                'count': int,
                'emergency_type': str or null
            },
            'high_demand_type': str or null   # type with highest total in window
        }, 200

    Errors:
        400: Invalid 'days' query parameter
        500: Database failure
    """
    try:
        raw_days = request.args.get('days', '30')
        try:
            period_days = min(int(raw_days), 90)
            if period_days < 1:
                period_days = 30
        except ValueError:
            return jsonify({'error': "'days' must be a positive integer"}), 400

        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=period_days)).date()
        end_date = now.date()

        # Query: count per (emergency_type, date) within the window
        rows = (
            db.session.query(
                EmergencyRequest.emergency_type,
                func.date(EmergencyRequest.created_at).label('day'),
                func.count(EmergencyRequest.id).label('cnt'),
            )
            .filter(func.date(EmergencyRequest.created_at) >= start_date)
            .group_by(EmergencyRequest.emergency_type, func.date(EmergencyRequest.created_at))
            .order_by(func.date(EmergencyRequest.created_at).asc())
            .all()
        )

        # Initialise result dicts
        trends = {et.value: [] for et in EmergencyType}
        totals = {et.value: 0 for et in EmergencyType}
        peak_count = 0
        peak_date = None
        peak_type = None

        for et, day, cnt in rows:
            day_str = str(day)
            trends[et.value].append({'date': day_str, 'count': cnt})
            totals[et.value] += cnt
            if cnt > peak_count:
                peak_count = cnt
                peak_date = day_str
                peak_type = et.value

        # Identify the type with the highest cumulative count in the period
        high_demand_type = max(totals, key=totals.get) if any(totals.values()) else None

        return jsonify({
            'period_days': period_days,
            'start_date': str(start_date),
            'end_date': str(end_date),
            'trends': trends,
            'totals': totals,
            'peak_day': {
                'date': peak_date,
                'count': peak_count,
                'emergency_type': peak_type,
            },
            'high_demand_type': high_demand_type,
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch trend data', 'details': str(e)}), 500
