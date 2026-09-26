"""
Member 2 Module 3: Risk Flagging & Urgency-Based Sorting
Automatically flags high-risk emergencies and sorts requests by risk score.

Routes:
  GET  /api/emergency/risk-flags  - List emergencies flagged as high-risk based on
                                     urgency, response delay, and helper availability
  GET  /api/emergency/sorted      - All pending requests sorted by urgency level + risk score
"""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import EmergencyRequest, EmergencyStatus, UrgencyLevel, User, UserRole

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member2_risk', __name__)


# ============================================================================
# RISK SCORING HELPERS
# ============================================================================

URGENCY_WEIGHT = {
    UrgencyLevel.HIGH:   4,
    UrgencyLevel.MEDIUM: 2,
    UrgencyLevel.LOW:    1,
}

# Minutes a PENDING request must wait before being penalised for delay
DELAY_THRESHOLD = {
    UrgencyLevel.HIGH:   10,   # 10 min delay → penalty for HIGH
    UrgencyLevel.MEDIUM: 25,   # 25 min delay → penalty for MEDIUM
    UrgencyLevel.LOW:    60,   # 60 min delay → penalty for LOW
}


def _compute_risk(req, available_helpers_count):
    """
    Calculate a numeric risk score for a single EmergencyRequest.

    Score components (all additive):
      - urgency_weight  : HIGH=3, MEDIUM=2, LOW=1
      - delay_penalty   : +2 if pending longer than the threshold for its urgency
      - no_helper_penalty : +2 if no helpers are currently available

    Returns:
        tuple (risk_score: int, is_high_risk: bool, risk_reasons: list[str])
    """
    score = URGENCY_WEIGHT.get(req.urgency_level, 1)
    reasons = []

    # Compute how long the request has been pending
    now = datetime.now(timezone.utc)
    created = req.created_at
    if created.tzinfo is None:
        # Treat naive datetimes as UTC
        created = created.replace(tzinfo=timezone.utc)

    minutes_pending = (now - created).total_seconds() / 60
    threshold = DELAY_THRESHOLD.get(req.urgency_level, 60)

    if minutes_pending > threshold:
        score += 2
        reasons.append(
            f'Pending for {int(minutes_pending)} min '
            f'(threshold {threshold} min for {req.urgency_level.value} urgency)'
        )

    if available_helpers_count == 0:
        score += 2
        reasons.append('No helpers currently available')

    if req.urgency_level == UrgencyLevel.HIGH:
        reasons.insert(0, 'High urgency level')

    is_high_risk = score >= 4
    return score, is_high_risk, reasons


# ============================================================================
# ROUTE: GET /api/emergency/risk-flags
# ============================================================================

@bp.route('/api/emergency/risk-flags', methods=['GET'])
@jwt_required()
def get_risk_flagged():
    """
    Return all PENDING emergency requests flagged as high-risk.

    A request is flagged when its computed risk_score >= 4, which occurs
    when it combines at least two of:
      - HIGH urgency (weight 3 already puts it at 3; one more factor = 5)
      - Extended delay beyond its urgency threshold
      - No available helpers

    Query Parameters:
        urgency (optional): Filter results to a specific urgency level
                            (low | medium | high)

    Returns:
        JSON: {
            'flagged': [
                {
                    'id': int,
                    'emergency_type': str,
                    'urgency_level': str,
                    'status': str,
                    'risk_score': int,
                    'risk_reasons': [str],
                    'minutes_pending': float,
                    'requester_name': str,
                    'created_at': str (ISO 8601)
                },
                ...
            ],
            'available_helpers': int
        }, 200

    Errors:
        500: Database failure
    """
    try:
        urgency_filter = request.args.get('urgency')

        # Count currently available helpers once (used for every risk calc)
        available_helpers_count = User.query.filter(
            User.role == UserRole.HELPER,
            User.is_available.is_(True)
        ).count()

        # Only PENDING requests can escalate — accepted ones already have a helper
        query = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.PENDING
        )

        if urgency_filter:
            try:
                ul = UrgencyLevel(urgency_filter.lower())
                query = query.filter(EmergencyRequest.urgency_level == ul)
            except ValueError:
                pass  # Silently ignore invalid urgency filter

        pending_requests = query.order_by(EmergencyRequest.created_at.asc()).all()

        flagged = []
        now = datetime.now(timezone.utc)

        for req in pending_requests:
            score, is_high_risk, reasons = _compute_risk(req, available_helpers_count)
            if not is_high_risk:
                continue

            created = req.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            minutes_pending = round((now - created).total_seconds() / 60, 1)

            flagged.append({
                'id': req.id,
                'emergency_type': req.emergency_type.value,
                'urgency_level': req.urgency_level.value,
                'status': req.status.value,
                'risk_score': score,
                'risk_reasons': reasons,
                'minutes_pending': minutes_pending,
                'requester_name': req.requester.name if req.requester else None,
                'created_at': req.created_at.isoformat(),
                'description': req.description,
            })

        # Sort flagged items: highest risk score first
        flagged.sort(key=lambda x: x['risk_score'], reverse=True)

        return jsonify({
            'flagged': flagged,
            'available_helpers': available_helpers_count,
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch risk-flagged requests', 'details': str(e)}), 500


# ============================================================================
# ROUTE: GET /api/emergency/sorted
# ============================================================================

@bp.route('/api/emergency/sorted', methods=['GET'])
@jwt_required()
def get_sorted_requests():
    """
    Return all PENDING emergency requests sorted by composite risk score
    (urgency weight + delay penalty + availability penalty) descending.

    This powers a priority-aware helper view so the most critical requests
    float to the top automatically.

    Returns:
        JSON: {
            'requests': [
                {
                    'id': int,
                    'emergency_type': str,
                    'urgency_level': str,
                    'status': str,
                    'risk_score': int,
                    'is_high_risk': bool,
                    'risk_reasons': [str],
                    'minutes_pending': float,
                    'requester_name': str,
                    'latitude': float,
                    'longitude': float,
                    'created_at': str (ISO 8601)
                },
                ...
            ],
            'available_helpers': int
        }, 200

    Errors:
        500: Database failure
    """
    try:
        available_helpers_count = User.query.filter(
            User.role == UserRole.HELPER,
            User.is_available.is_(True)
        ).count()

        pending_requests = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.PENDING
        ).all()

        now = datetime.now(timezone.utc)
        enriched = []

        for req in pending_requests:
            score, is_high_risk, reasons = _compute_risk(req, available_helpers_count)

            created = req.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            minutes_pending = round((now - created).total_seconds() / 60, 1)

            enriched.append({
                'id': req.id,
                'emergency_type': req.emergency_type.value,
                'urgency_level': req.urgency_level.value,
                'status': req.status.value,
                'risk_score': score,
                'is_high_risk': is_high_risk,
                'risk_reasons': reasons,
                'minutes_pending': minutes_pending,
                'requester_name': req.requester.name if req.requester else None,
                'description': req.description,
                'latitude': req.latitude,
                'longitude': req.longitude,
                'created_at': req.created_at.isoformat(),
            })

        # Primary sort: risk_score descending; secondary: created_at ascending (older first)
        enriched.sort(key=lambda x: (-x['risk_score'], x['created_at']))

        return jsonify({
            'requests': enriched,
            'available_helpers': available_helpers_count,
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch sorted requests', 'details': str(e)}), 500
