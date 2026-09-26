/**
 * Emergency Card Component
 * Displays a compact emergency request card
 */

import { formatDistanceToNow, format } from 'date-fns';

export default function EmergencyCard({
  emergency,
  isSelected,
  onSelect,
  onDetailsClick,
}) {
  const getPriorityBg = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-700';
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-orange-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-400';
      case 'accepted':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-red-500';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 cursor-pointer transition transform hover:scale-102 ${
        isSelected
          ? 'border-blue-600 bg-blue-50 shadow-lg'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-gray-900 flex-1 line-clamp-2">{emergency.title}</h3>
        <span className={`${getPriorityBg(emergency.priority)} text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap ml-2`}>
          {emergency.priority.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
        {emergency.description}
      </p>

      <div className="flex gap-2 mb-3">
        <span
          className={`${getStatusBg(
            emergency.status
          )} text-white text-xs font-bold px-2 py-1 rounded`}
        >
          {emergency.status.replace('_', ' ').toUpperCase()}
        </span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {emergency.emergency_type.replace('_', ' ')}
        </span>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        📍 {emergency.location_name || `${emergency.latitude.toFixed(4)}, ${emergency.longitude.toFixed(4)}`}
      </div>

      <div className="text-xs text-gray-600 mb-3">
        {formatDistanceToNow(new Date(emergency.created_at), { addSuffix: true })}
      </div>

      {emergency.requester && (
        <div className="text-xs text-gray-600 mb-2">
          👤 {emergency.requester.full_name}
        </div>
      )}

      {emergency.helper && (
        <div className="text-xs text-green-700 bg-green-50 p-2 rounded mb-3">
          ✓ Assigned to: {emergency.helper.full_name}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDetailsClick();
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded transition"
      >
        View Details
      </button>
    </div>
  );
}
