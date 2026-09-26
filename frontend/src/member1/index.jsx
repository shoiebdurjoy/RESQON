/**
 * Member 1 Components: Authentication, Emergency Request Creation & Analytics Dashboard
 *
 * Module 1 (Authentication):
 * - Login: User login page with email/password authentication
 * - Register: User registration page (requester/helper) with form validation
 *
 * Module 2 (Emergency Request Creation):
 * - CreateRequest: Emergency request creation with map location picker
 *
 * Module 3 (Interactive Dashboard & Emergency Analytics):
 * - AnalyticsDashboard: Global system stats, recent activity feed,
 *     most requested type, completion rate, average response time
 */

// Module 1 — Authentication
export { default as Login } from '../pages/Login';
export { default as Register } from '../pages/Register';

// Module 2 — Emergency Request Creation
export { default as CreateRequest } from '../pages/CreateEmergency';

// Module 3 — Interactive Dashboard & Emergency Analytics
export { default as AnalyticsDashboard } from '../pages/AnalyticsDashboard';
