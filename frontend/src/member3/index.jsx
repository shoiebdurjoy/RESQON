/**
 * Member 3 Components: Request Management, Chat & Trends/Timeline
 *
 * Module 1 (Profile / Request Management):
 * - RequestDetails: Accept, Reject, Complete, Cancel actions; status flow
 *
 * Module 2 (Chat System):
 * - ChatBox: Real-time WebSocket chat interface for emergency communication
 *
 * Module 3 (SMS Timestamps & Trend Tracking):
 * - TrendsDashboard: Per-request status timeline (creation, acceptance, completion
 *     timestamps) and emergency type trend data over the last 30 days
 */

// Module 2 — Real-time Chat
export { default as ChatBox } from '../components/ChatBox';

// Module 1 — Request Management
export { default as RequestDetails } from '../pages/RequestDetails';

// Module 3 — Status Timeline & Trend Tracking
export { default as TrendsDashboard } from '../pages/TrendsDashboard';
