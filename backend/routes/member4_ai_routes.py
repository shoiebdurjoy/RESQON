"""
Member 4 Module 3: AI-Based Emergency Assistant & Performance Metrics
Uses the OpenAI Chat API to summarise emergency descriptions and suggest urgency levels.
Also exposes system-wide performance statistics.

Routes:
  POST  /api/ai/summarize           - Generate a concise AI summary of an emergency
                                       description and suggest an urgency level
  GET   /api/analytics/performance  - Average handling time, response efficiency,
                                       and helper participation rate
"""

import os
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import EmergencyRequest, EmergencyStatus, User, UserRole

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member4_ai', __name__)


# ============================================================================
# OPENAI CLIENT INITIALISATION
# ============================================================================

def _get_openai_client():
    """
    Lazily initialise the OpenAI client.
    Returns None if the API key is not configured so the endpoint can
    gracefully degrade instead of crashing at import time.
    """
    api_key = os.getenv('OPENAI_API_KEY', '')
    if not api_key:
        return None
    try:
        from openai import OpenAI  # type: ignore
        return OpenAI(api_key=api_key)
    except ImportError:
        return None


# ============================================================================
# ROUTE: POST /api/ai/summarize
# ============================================================================

@bp.route('/api/ai/summarize', methods=['POST'])
@jwt_required()
def ai_summarize():
    """
    Generate a concise AI summary of an emergency description and suggest
    an appropriate urgency level using the OpenAI Chat API (gpt-3.5-turbo).

    Request Body (JSON):
        {
            "description": str   # Raw emergency description text (required)
        }

    Returns:
        JSON: {
            'summary': str,            # 1-2 sentence AI-generated summary
            'suggested_urgency': str,  # 'low' | 'medium' | 'high'
            'reasoning': str,          # Brief explanation for the urgency suggestion
            'ai_available': bool       # false when no API key is configured
        }, 200

    Errors:
        400: Missing or empty description
        500: AI API error or unexpected failure
    """
    data = request.get_json()
    if not data or not data.get('description', '').strip():
        return jsonify({'error': "'description' field is required and must not be empty"}), 400

    description = data['description'].strip()

    client = _get_openai_client()

    # ---- Graceful degradation when OpenAI is not configured ----
    if client is None:
        # Return a rule-based fallback so the UI still works without an API key
        word_count = len(description.split())
        if any(kw in description.lower() for kw in ['critical', 'severe', 'dying', 'unconscious', 'urgent', 'immediately']):
            suggested = 'high'
            reasoning = 'Description contains critical keywords.'
        elif any(kw in description.lower() for kw in ['moderate', 'help', 'need', 'pain']):
            suggested = 'medium'
            reasoning = 'Description suggests a moderate situation.'
        else:
            suggested = 'low'
            reasoning = 'No critical keywords detected.'

        return jsonify({
            'summary': description[:200] + ('...' if len(description) > 200 else ''),
            'suggested_urgency': suggested,
            'reasoning': reasoning,
            'ai_available': False,
        }), 200

    # ---- Call OpenAI ----
    try:
        system_prompt = (
            "You are an emergency triage assistant for a Smart Emergency Help & Coordination System. "
            "Your job is to analyse emergency descriptions and provide:\n"
            "1. A concise 1-2 sentence summary of the situation.\n"
            "2. A suggested urgency level: 'low', 'medium', or 'high'.\n"
            "3. A brief one-sentence reasoning for your urgency suggestion.\n\n"
            "Respond ONLY in valid JSON with this exact schema:\n"
            '{"summary": "...", "suggested_urgency": "low|medium|high", "reasoning": "..."}'
        )

        response = client.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': f'Emergency description:\n{description}'},
            ],
            max_tokens=200,
            temperature=0.3,
        )

        raw = response.choices[0].message.content.strip()

        # Parse the JSON response from the model
        import json
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            # Fallback: the model didn't return clean JSON
            return jsonify({
                'summary': raw[:300],
                'suggested_urgency': 'medium',
                'reasoning': 'AI response could not be parsed; defaulting to medium urgency.',
                'ai_available': True,
            }), 200

        # Normalise urgency to allowed values
        urgency = parsed.get('suggested_urgency', 'medium').lower()
        if urgency not in ('low', 'medium', 'high'):
            urgency = 'medium'

        return jsonify({
            'summary': parsed.get('summary', raw),
            'suggested_urgency': urgency,
            'reasoning': parsed.get('reasoning', ''),
            'ai_available': True,
        }), 200

    except Exception:
        # OpenAI call failed (quota exceeded, network error, etc.)
        # Fall back to rule-based analysis so the feature still works
        pass

    # ---- Rule-based fallback (OpenAI unavailable or quota exceeded) ----
    desc_lower = description.lower()
    words = desc_lower.split()

    high_keywords   = ['critical', 'severe', 'dying', 'unconscious', 'unresponsive',
                       'cardiac', 'heart attack', 'stroke', 'not breathing', 'collapsed',
                       'bleeding heavily', 'chest pain', 'urgent', 'immediately', 'life']
    medium_keywords = ['moderate', 'help', 'pain', 'injured', 'accident', 'broken',
                       'fever', 'breathing', 'difficulty', 'dizzy', 'weak']

    if any(kw in desc_lower for kw in high_keywords):
        suggested = 'high'
        reasoning = 'Description contains critical emergency keywords indicating a life-threatening situation.'
        summary   = f'Emergency report: {description[:150].rstrip()}{"..." if len(description) > 150 else ""}. Immediate high-priority response recommended.'
    elif any(kw in desc_lower for kw in medium_keywords):
        suggested = 'medium'
        reasoning = 'Description suggests a moderate emergency requiring prompt attention.'
        summary   = f'Emergency report: {description[:150].rstrip()}{"..." if len(description) > 150 else ""}. Medium-priority response recommended.'
    else:
        suggested = 'low'
        reasoning = 'No critical keywords detected; situation appears non-life-threatening.'
        summary   = f'Emergency report: {description[:150].rstrip()}{"..." if len(description) > 150 else ""}. Standard response recommended.'

    return jsonify({
        'summary': summary,
        'suggested_urgency': suggested,
        'reasoning': reasoning,
        'ai_available': False,
    }), 200


# ============================================================================
# ROUTE: GET /api/analytics/performance
# ============================================================================

@bp.route('/api/analytics/performance', methods=['GET'])
@jwt_required()
def performance_metrics():
    """
    Return system-wide performance metrics for helpers and request resolution.

    Metrics:
        avg_handling_time_minutes : average minutes from accepted_at → completed_at
                                     across all COMPLETED requests
        response_efficiency       : percentage of closed requests (completed + cancelled)
                                     that were completed (not cancelled).  Measures
                                     how often a started response results in success.
        helper_participation_rate : percentage of registered helpers who have
                                     accepted at least one emergency request ever.
        total_helpers             : total registered helpers
        active_helpers            : helpers who have handled >= 1 request
        total_completed           : total COMPLETED requests
        total_cancelled           : total CANCELLED requests

    Returns:
        JSON: {
            'performance': {
                'avg_handling_time_minutes': float or null,
                'response_efficiency': float,          # 0-100 percent
                'helper_participation_rate': float,    # 0-100 percent
                'total_helpers': int,
                'active_helpers': int,
                'total_completed': int,
                'total_cancelled': int
            }
        }, 200

    Errors:
        500: Database failure
    """
    try:
        # ---- Average handling time (accepted → completed) ----
        completed_reqs = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.COMPLETED,
            EmergencyRequest.accepted_at.isnot(None),
            EmergencyRequest.completed_at.isnot(None),
        ).all()

        if completed_reqs:
            total_handling_seconds = sum(
                (req.completed_at - req.accepted_at).total_seconds()
                for req in completed_reqs
                if req.completed_at and req.accepted_at
            )
            avg_handling_time = round(total_handling_seconds / len(completed_reqs) / 60, 2)
        else:
            avg_handling_time = None

        # ---- Response efficiency ----
        total_completed = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.COMPLETED
        ).count()
        total_cancelled = EmergencyRequest.query.filter(
            EmergencyRequest.status == EmergencyStatus.CANCELLED
        ).count()

        closed = total_completed + total_cancelled
        response_efficiency = round((total_completed / closed * 100), 2) if closed > 0 else 0.0

        # ---- Helper participation rate ----
        total_helpers = User.query.filter(User.role == UserRole.HELPER).count()

        # Helpers who have at least one accepted/completed request
        active_helper_ids = (
            db.session.query(EmergencyRequest.helper_id)
            .filter(EmergencyRequest.helper_id.isnot(None))
            .distinct()
            .all()
        )
        active_helpers = len(active_helper_ids)

        participation_rate = round(
            (active_helpers / total_helpers * 100), 2
        ) if total_helpers > 0 else 0.0

        return jsonify({
            'performance': {
                'avg_handling_time_minutes': avg_handling_time,
                'response_efficiency': response_efficiency,
                'helper_participation_rate': participation_rate,
                'total_helpers': total_helpers,
                'active_helpers': active_helpers,
                'total_completed': total_completed,
                'total_cancelled': total_cancelled,
            }
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch performance metrics', 'details': str(e)}), 500
