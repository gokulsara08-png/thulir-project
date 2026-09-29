import { Check } from 'lucide-react';

const ALL_STEPS = ['REQUESTED','ACCEPTED','ON_THE_WAY','ARRIVED','COLLECTED','IN_TRANSIT','DELIVERED'];

export default function StatusTracker({ currentStatus, steps = ALL_STEPS, labels = {} }) {
  const currentIdx = steps.indexOf(currentStatus);

  return (
    <div className="status-tracker" style={{ flexWrap: 'wrap', gap: '0.25rem' }}>
      {steps.map((step, i) => {
        const isCompleted = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={step} className="status-step">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div className={`status-dot ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                {isCompleted && <Check size={8} style={{ color: 'white' }} />}
              </div>
              <span className={`status-text ${isActive ? 'active' : ''}`}>
                {labels[step] || step.replace(/_/g, ' ')}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`status-line ${isCompleted ? 'completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
