import React, { useState } from 'react';

// Floating Tooltip Component
const Tooltip = ({ item, x, y }) => {
  if (!item) return null;
  return (
    <div style={{
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '8px 12px',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 600,
      pointerEvents: 'none',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      whiteSpace: 'nowrap',
      transition: 'left 0.1s ease, top 0.1s ease',
      transform: 'translate(-50%, -100%)',
      marginTop: '-10px'
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
        {item.name || item.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'inline-block' }} />
        <span>Count: <strong style={{ color: 'var(--accent-secondary)' }}>{item.count}</strong></span>
      </div>
    </div>
  );
};

export const BarChart = ({ data = [] }) => {
  const [activeItem, setActiveItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (data.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No data available</div>;

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const chartHeight = 160;
  const barWidth = 42;
  const gap = 24;
  const paddingLeft = 40;
  const totalWidth = data.length * (barWidth + gap) + paddingLeft;

  const handleMouseMove = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgEl = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltipPos({
      x: rect.left - svgEl.left + barWidth / 2,
      y: rect.top - svgEl.top
    });
    setActiveItem(item);
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <Tooltip item={activeItem} x={tooltipPos.x} y={tooltipPos.y} />
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${totalWidth} 200`} style={{ width: '100%', height: '220px' }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-secondary)" />
              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="activeBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="100%" stopColor="var(--accent-secondary)" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" floodColor="var(--accent-primary)" />
            </filter>
          </defs>
          
          {/* Y Axis line */}
          <line x1={paddingLeft} y1="10" x2={paddingLeft} y2={chartHeight} stroke="var(--border-color)" strokeWidth="1" />
          
          {/* X Axis line */}
          <line x1={paddingLeft} y1={chartHeight} x2={totalWidth} y2={chartHeight} stroke="var(--border-color)" strokeWidth="1" />
          
          {/* Grid lines */}
          <line x1={paddingLeft} y1={chartHeight / 2} x2={totalWidth} y2={chartHeight / 2} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
          <line x1={paddingLeft} y1="20" x2={totalWidth} y2="20" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

          {data.map((item, index) => {
            const x = paddingLeft + index * (barWidth + gap) + 12;
            const h = (item.count / maxVal) * (chartHeight - 30);
            const y = chartHeight - h;
            const isHovered = activeItem === item;

            return (
              <g key={index} style={{ cursor: 'pointer' }}>
                {/* Bar Background Hover Area */}
                <rect
                  x={x - 6}
                  y="10"
                  width={barWidth + 12}
                  height={chartHeight - 10}
                  fill="transparent"
                  onMouseMove={(e) => handleMouseMove(e, item)}
                  onMouseLeave={() => setActiveItem(null)}
                />

                {/* Animated Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx="6"
                  fill={isHovered ? "url(#activeBarGrad)" : "url(#barGrad)"}
                  filter={isHovered ? "url(#shadow)" : ""}
                  style={{ 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transformOrigin: `${x + barWidth/2}px ${chartHeight}px`
                  }}
                  opacity={isHovered ? 1 : 0.9}
                  onMouseMove={(e) => handleMouseMove(e, item)}
                  onMouseLeave={() => setActiveItem(null)}
                />
                
                {/* Value Text */}
                <text 
                  x={x + barWidth / 2} 
                  y={y - 8} 
                  textAnchor="middle" 
                  fill={isHovered ? "var(--accent-secondary)" : "var(--text-primary)"} 
                  fontSize="11" 
                  fontWeight="700"
                  style={{ transition: 'fill 0.2s', pointerEvents: 'none' }}
                >
                  {item.count}
                </text>
                
                {/* Label Text */}
                <text 
                  x={x + barWidth / 2} 
                  y={chartHeight + 18} 
                  textAnchor="middle" 
                  fill={isHovered ? "var(--text-primary)" : "var(--text-secondary)"} 
                  fontSize="10"
                  fontWeight={isHovered ? "600" : "normal"}
                  style={{ transition: 'all 0.2s', pointerEvents: 'none' }}
                >
                  {(() => {
                    const rawLabel = item.name || item.label || '';
                    return rawLabel.length > 10 ? `${rawLabel.slice(0, 10)}...` : rawLabel;
                  })()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const LineChart = ({ data = [] }) => {
  const [activeItem, setActiveItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (data.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No data available</div>;

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const width = 500;
  const height = 180;
  const padding = 30;
  
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate points coordinates
  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(1, data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (item.count / maxVal) * chartHeight;
    return { x, y, ...item };
  });

  // Generate cubic bezier curve path for smooth rendering
  const getBezierPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 3;
      const cp1y = curr.y;
      const cp2x = curr.x + 2 * (next.x - curr.x) / 3;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const pathD = getBezierPath(points);
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  const handleMouseMove = (e, p) => {
    const svgEl = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltipPos({
      x: (p.x / width) * svgEl.width,
      y: (p.y / height) * svgEl.height
    });
    setActiveItem(p);
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <Tooltip item={activeItem} x={tooltipPos.x} y={tooltipPos.y} />
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '220px', overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid Lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1={padding} y1={padding + chartHeight/2} x2={width - padding} y2={padding + chartHeight/2} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="1" />

        {/* Area under curve */}
        {areaD && <path d={areaD} fill="url(#areaGrad)" />}

        {/* Smooth Path line */}
        {pathD && (
          <path 
            d={pathD} 
            fill="none" 
            stroke="var(--accent-primary)" 
            strokeWidth="3.5" 
            strokeLinecap="round"
            filter="url(#glow)"
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              animation: 'drawLine 1.5s ease-out forwards'
            }}
          />
        )}

        {/* Interactive Hover Grid Lines */}
        {activeItem && (
          <line
            x1={activeItem.x}
            y1={padding}
            x2={activeItem.x}
            y2={height - padding}
            stroke="var(--border-color)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* Data Points */}
        {points.map((p, index) => {
          const isHovered = activeItem === p;
          return (
            <g key={index}>
              {/* Point hover detector */}
              <circle
                cx={p.x}
                cy={p.y}
                r="16"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => handleMouseMove(e, p)}
                onMouseLeave={() => setActiveItem(null)}
              />

              {/* Point dot visual */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? "7" : "5"}
                fill={isHovered ? "#fff" : "var(--bg-secondary)"}
                stroke={isHovered ? "var(--accent-primary)" : "var(--accent-secondary)"}
                strokeWidth={isHovered ? "3.5" : "3"}
                style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                pointerEvents="none"
              />
              
              {/* X Axis Labels */}
              <text x={p.x} y={height - 8} textAnchor="middle" fill="var(--text-secondary)" fontSize="10">
                {p.label || p.name}
              </text>
            </g>
          );
        })}
      </svg>
      <style>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};

export const DonutChart = ({ data = [] }) => {
  const [activeItem, setActiveItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (data.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No data available</div>;

  const total = data.reduce((sum, item) => sum + item.count, 0) || 1;
  const size = 200;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const colors = [
    'var(--accent-primary)',
    'var(--accent-secondary)',
    '#10b981', // green
    '#f59e0b', // amber
    '#3b82f6', // blue
  ];

  let accumulatedAngle = 0;

  const handleMouseMove = (e, item) => {
    const svgEl = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltipPos({
      x: svgEl.width / 2,
      y: svgEl.height / 2
    });
    setActiveItem(item);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', position: 'relative' }}>
      <Tooltip item={activeItem} x={tooltipPos.x} y={tooltipPos.y} />
      
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, index) => {
          const percentage = item.count / total;
          const strokeLength = percentage * circumference;
          const strokeOffset = circumference - strokeLength + accumulatedAngle;
          accumulatedAngle -= strokeLength;
          
          const color = colors[index % colors.length];
          const isHovered = activeItem === item;

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth={isHovered ? "28" : "24"}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform={`rotate(-90 ${center} ${center})`}
              style={{ 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseMove={(e) => handleMouseMove(e, item)}
              onMouseLeave={() => setActiveItem(null)}
              opacity={activeItem && !isHovered ? 0.6 : 1}
            />
          );
        })}
        
        {/* Center hole cutout */}
        <circle cx={center} cy={center} r={radius - 12} fill="var(--bg-secondary)" />
        
        {/* Dynamic Center Labels */}
        <text x={center} y={center - 6} textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="600" letterSpacing="0.5">
          {activeItem ? (activeItem.name || activeItem.label).toUpperCase() : 'TOTAL'}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="800">
          {activeItem ? activeItem.count : total}
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.map((item, index) => {
          const color = colors[index % colors.length];
          const pct = Math.round((item.count / total) * 100);
          const isHovered = activeItem === item;

          return (
            <div 
              key={index} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '13px',
                cursor: 'pointer',
                transform: isHovered ? 'translateX(4px)' : 'none',
                opacity: activeItem && !isHovered ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={() => setActiveItem(item)}
              onMouseLeave={() => setActiveItem(null)}
            >
              <span style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: color, 
                display: 'inline-block',
                boxShadow: isHovered ? `0 0 8px ${color}` : 'none',
                transition: 'all 0.2s'
              }} />
              <span style={{ color: 'var(--text-primary)', fontWeight: isHovered ? '700' : '500' }}>{item.name || item.label}:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{item.count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
