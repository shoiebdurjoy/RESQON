function formatTimestamp(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toLocaleString();
}

const STEPS = [
  { key: 'created_at',   label: 'Request Created', dotColor: '#D0CEC4', activeColor: '#1854B4' },
  { key: 'accepted_at',  label: 'Helper Accepted',  dotColor: '#D0CEC4', activeColor: '#1A7F4E' },
  { key: 'completed_at', label: 'Completed',         dotColor: '#D0CEC4', activeColor: '#1A7F4E' },
];

export default function StatusTimeline({ request }) {
  if (!request) return null;
  const status = String(request.status || '').toLowerCase();
  const isCancelled = status === 'cancelled';

  const steps = isCancelled
    ? [
        ...STEPS.slice(0, 2),
        { key: 'completed_at', label: 'Cancelled', dotColor: '#D0CEC4', activeColor: '#D93B2B' },
      ]
    : STEPS;

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '1rem' }}>Status Timeline</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map((step, i) => {
          const ts   = formatTimestamp(request[step.key]);
          const done = Boolean(ts);
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} style={{ display: 'flex', gap: '0.875rem' }}>
              {/* Dot + line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? `${step.activeColor}14` : '#F7F6F1',
                  border: `2px solid ${done ? step.activeColor : '#D0CEC4'}`,
                  fontSize: '0.8125rem',
                }}>
                  {done
                    ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: step.activeColor, display: 'block' }} />
                    : <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D0CEC4', display: 'block' }} />}
                </div>
                {!isLast && (
                  <div style={{ width: 2, flex: 1, marginTop: 4, background: done ? `${step.activeColor}30` : '#E4E2DA', minHeight: 28 }} />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: isLast ? 0 : '1.125rem', flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: done ? '#0D0C0A' : '#8A8878', marginBottom: '0.15rem' }}>{step.label}</p>
                {ts
                  ? <p style={{ fontSize: '0.75rem', color: '#5A5850' }}>{ts}</p>
                  : <p style={{ fontSize: '0.75rem', color: '#D0CEC4', fontStyle: 'italic' }}>Not yet reached</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}