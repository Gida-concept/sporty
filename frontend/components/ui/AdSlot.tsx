interface AdSlotProps {
  slotId: string;
  format: 'rectangle' | 'leaderboard' | 'skyscraper';
  className?: string;
  label?: string;
  customHtml?: string | null;
}

const DIMENSIONS: Record<AdSlotProps['format'], { width: number; height: number }> = {
  rectangle: { width: 300, height: 250 },
  leaderboard: { width: 728, height: 90 },
  skyscraper: { width: 160, height: 600 },
};

export default function AdSlot({ slotId, format, className = '', label, customHtml }: AdSlotProps) {
  const dim = DIMENSIONS[format];

  // If custom HTML is provided, render the ad code directly
  if (customHtml) {
    return (
      <div className={className}>
        {label && <p className="mb-1 text-center text-xs uppercase tracking-wider text-gray-400">{label}</p>}
        <div dangerouslySetInnerHTML={{ __html: customHtml }} />
      </div>
    );
  }

  // Fallback: render placeholder
  return (
    <div className={className}>
      <p className="ad-label">{label || 'Advertisement'}</p>
      <div
        id={slotId}
        className="ad-placeholder mx-auto"
        style={{ width: dim.width, height: dim.height }}
      >
        <span>
          {dim.width} &times; {dim.height}
        </span>
      </div>
    </div>
  );
}
