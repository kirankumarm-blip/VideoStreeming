import React from 'react';

export const BarChart = ({ data = [] }) => {
  if (data.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No data available</div>;

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const chartHeight = 160;
  const barWidth = 40;
  const gap = 20;
  const paddingLeft = 40;
  const paddingBottom = 30;
  const totalWidth = data.length * (barWidth + gap) + paddingLeft;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${totalWidth} 200`} style={{ width: '100%', height: '220px' }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-secondary)" />
            <stop offset="100%" stopColor="var(--accent-primary)" />
          </linearGradient>
        </defs>
        
        {/* Y Axis line */}
        <line x1={paddingLeft} y1="10" x2={paddingLeft} y2={chartHeight} stroke="var(--border-color)" strokeWidth="1" />
        
        {/* X Axis line */}
        <line x1={paddingLeft} y1={chartHeight} x2={totalWidth} y2={chartHeight} stroke="var(--border-color)" strokeWidth="1" />
        
        {data.map((item, index) => {
          const x = paddingLeft + index * (barWidth + gap) + 10;
          const h = (item.count / maxVal) * (chartHeight - 20);
          const y = chartHeight - h;

          return (
            <g key={index} style={{ cursor: 'pointer' }}>
              <title>{`${item.name || item.label}: ${item.count} views`}</title>
              
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx="4"
                fill="url(#barGrad)"
                style={{ transition: 'all 0.3s' }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0.85'}
                opacity="0.85"
              />
              
              {/* Value Text */}
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">
                {item.count}
              </text>
              
              {/* Label Text */}
              <text x={x + barWidth / 2} y={chartHeight + 18} textAnchor="middle" fill="var(--text-secondary)" fontSize="10">
                {item.name ? (item.name.length > 8 ? `${item.name.slice(0, 7)}..` : item.name) : item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const LineChart = ({ data = [] }) => {
  if (data.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No data available</div>;

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const width = 500;
  const height = 180;
  const padding = 30;
  
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate points
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (item.count / maxVal) * chartHeight;
    return { x, y, ...item };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '220px' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Grid Lines */}
      <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1={padding} y1={padding + chartHeight/2} x2={width - padding} y2={padding + chartHeight/2} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="1" />

      {/* Area under curve */}
      {areaD && <path d={areaD} fill="url(#areaGrad)" />}

      {/* Path line */}
      {pathD && <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" />}

      {/* Data Points */}
      {points.map((p, index) => (
        <g key={index}>
          <circle
            cx={p.x}
            cy={p.y}
            r="5"
            fill="var(--bg-secondary)"
            stroke="var(--accent-secondary)"
            strokeWidth="3"
            style={{ cursor: 'pointer' }}
          />
          <title>{`${p.label || p.name}: ${p.count}`}</title>
          
          {/* Label Text */}
          <text x={p.x} y={height - 8} textAnchor="middle" fill="var(--text-secondary)" fontSize="10">
            {p.label || p.name}
          </text>
          
          {/* Value Text */}
          <text x={p.x} y={p.y - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="600">
            {p.count}
          </text>
        </g>
      ))}
    </svg>
  );
};

export const DonutChart = ({ data = [] }) => {
  if (data.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No data available</div>;

  const total = data.reduce((sum, item) => sum + item.count, 0) || 1;
  const size = 200;
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Curated color palette
  const colors = [
    'var(--accent-primary)',
    'var(--accent-secondary)',
    '#10b981', // green
    '#f59e0b', // amber
    '#3b82f6', // blue
  ];

  let accumulatedAngle = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, index) => {
          const percentage = item.count / total;
          const strokeLength = percentage * circumference;
          const strokeOffset = circumference - strokeLength + accumulatedAngle;
          accumulatedAngle -= strokeLength;
          
          const color = colors[index % colors.length];

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="24"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            >
              <title>{`${item.name || item.label}: ${item.count} (${Math.round(percentage * 100)}%)`}</title>
            </circle>
          );
        })}
        
        {/* Center label */}
        <circle cx={center} cy={center} r={radius - 12} fill="var(--bg-secondary)" />
        <text x={center} y={center - 4} textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="500">
          TOTAL
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700">
          {total}
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((item, index) => {
          const color = colors[index % colors.length];
          const pct = Math.round((item.count / total) * 100);
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{item.name || item.label}:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{item.count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
