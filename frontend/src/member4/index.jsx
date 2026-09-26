/**
 * Member 4 Components: History, Dashboard, Notifications & AI Assistant
 *
 * Module 1 (Dashboard & History):
 * - Dashboard: Main coordination dashboard (requester/helper views)
 * - History: Emergency request history with full timeline and messages
 * - StatusTimeline: Visual timeline component for request status changes
 *
 * Module 3 (AI-Based Emergency Assistant & Performance Metrics):
 * - AIAssistant: Uses OpenAI API to generate concise summaries of emergency
 *     descriptions and suggest urgency levels; also shows system performance
 *     metrics (avg handling time, response efficiency, helper participation rate)
 */

// Module 1 — Dashboard & History
export { default as Dashboard } from '../pages/Dashboard';
export { default as History } from '../pages/NotificationHistory';
export { default as StatusTimeline } from '../components/StatusTimeline';

// Module 3 — AI Assistant & Performance Metrics
export { default as AIAssistant } from '../pages/AIAssistant';
