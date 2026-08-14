import React, { useState, useRef, useEffect } from 'react';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const PremiumDatePicker = ({
  value,
  onChange,
  placeholder = "Select Date of Birth",
  disabled = false,
  className = "",
  style = {},
  minYear = 1940,
  maxYear = new Date().getFullYear()
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const todayObj = new Date();
  const todayMidnight = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

  // Yesterday date
  const yesterdayObj = new Date(todayMidnight.getTime() - 86400000);
  const yesterdayStr = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayObj.getDate()).padStart(2, '0')}`;

  // Parse initial date string (YYYY-MM-DD)
  const initialDate = value ? new Date(value) : yesterdayObj;
  const validInitialDate = !isNaN(initialDate.getTime()) ? initialDate : yesterdayObj;

  const [currentMonth, setCurrentMonth] = useState(validInitialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(validInitialDate.getFullYear());

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        // If passed value is today or future, auto-clamp to yesterday
        if (d >= todayMidnight) {
          onChange({ target: { value: yesterdayStr } });
        } else {
          setCurrentMonth(d.getMonth());
          setCurrentYear(d.getFullYear());
        }
      }
    }
  }, [value]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const isNextMonthDisabled = () => {
    if (currentYear > todayObj.getFullYear()) return true;
    if (currentYear === todayObj.getFullYear() && currentMonth >= todayObj.getMonth()) return true;
    return false;
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled()) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    const cellDate = new Date(currentYear, currentMonth, day);
    if (cellDate >= todayMidnight) return; // Block today and future dates

    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const formatted = `${currentYear}-${m}-${d}`;
    onChange({ target: { value: formatted } });
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ target: { value: '' } });
    setIsOpen(false);
  };

  const handleYesterday = () => {
    const y = yesterdayObj.getFullYear();
    const m = String(yesterdayObj.getMonth() + 1).padStart(2, '0');
    const d = String(yesterdayObj.getDate()).padStart(2, '0');
    setCurrentYear(y);
    setCurrentMonth(yesterdayObj.getMonth());
    onChange({ target: { value: `${y}-${m}-${d}` } });
    setIsOpen(false);
  };

  // Generate calendar matrix
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const effectiveMaxYear = Math.min(maxYear, todayObj.getFullYear());
  const yearOptions = [];
  for (let y = effectiveMaxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  const selectedDateObj = value ? new Date(value) : null;
  const isSelectedDateValid = selectedDateObj && !isNaN(selectedDateObj.getTime());
  const selectedDay = isSelectedDateValid ? selectedDateObj.getDate() : null;
  const selectedMonth = isSelectedDateValid ? selectedDateObj.getMonth() : null;
  const selectedYear = isSelectedDateValid ? selectedDateObj.getFullYear() : null;

  return (
    <div ref={containerRef} className={`premium-date-picker ${className}`} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-secondary, rgba(255,255,255,0.05))',
          border: isOpen ? '1px solid var(--accent-primary, #e50914)' : '1px solid var(--border-color, rgba(255,255,255,0.12))',
          borderRadius: '10px',
          color: value ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #94a3b8)',
          fontSize: '14px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(229, 9, 20, 0.25), 0 8px 20px rgba(0,0,0,0.3)' : 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: disabled ? 0.6 : 1,
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-regular fa-calendar-days" style={{ color: 'var(--accent-primary, #e50914)', fontSize: '15px' }}></i>
          <span>{value || placeholder}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {value && (
            <i
              className="fa-solid fa-xmark"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}
              title="Clear date"
            />
          )}
          <i
            className="fa-solid fa-chevron-down"
            style={{
              fontSize: '12px',
              color: isOpen ? 'var(--accent-primary, #e50914)' : 'var(--text-secondary, #94a3b8)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease'
            }}
          />
        </div>
      </div>

      {/* Floating Calendar Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 1000,
          width: '320px',
          backgroundColor: 'var(--bg-secondary, #18181c)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
          borderRadius: '14px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)',
          padding: '16px',
          animation: 'calendarFadeIn 0.2s ease-out'
        }}>
          {/* Calendar Header with Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <i className="fa-solid fa-chevron-left" style={{ fontSize: '12px' }}></i>
            </button>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Month Select */}
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                  color: 'var(--text-primary, #ffffff)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {MONTHS.map((m, idx) => {
                  const isMonthInFuture = currentYear === todayObj.getFullYear() && idx > todayObj.getMonth();
                  return (
                    <option key={m} value={idx} disabled={isMonthInFuture}>
                      {m}
                    </option>
                  );
                })}
              </select>

              {/* Year Select */}
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                  color: 'var(--text-primary, #ffffff)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={isNextMonthDisabled()}
              onClick={handleNextMonth}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isNextMonthDisabled() ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',
                cursor: isNextMonthDisabled() ? 'not-allowed' : 'pointer',
                opacity: isNextMonthDisabled() ? 0.4 : 1
              }}
            >
              <i className="fa-solid fa-chevron-right" style={{ fontSize: '12px' }}></i>
            </button>
          </div>

          {/* Days of Week Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
            {DAYS.map(day => (
              <div key={day} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', padding: '4px 0' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {/* Trailing Days of Previous Month */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const dayNum = prevMonthDays - firstDayIndex + idx + 1;
              return (
                <div key={`prev-${idx}`} style={{ textAlign: 'center', padding: '8px 0', fontSize: '13px', color: 'rgba(255,255,255,0.2)', cursor: 'default' }}>
                  {dayNum}
                </div>
              );
            })}

            {/* Days of Current Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const cellDate = new Date(currentYear, currentMonth, dayNum);
              const isDisabled = cellDate >= todayMidnight;
              const isSelected = selectedDay === dayNum && selectedMonth === currentMonth && selectedYear === currentYear;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(dayNum)}
                  style={{
                    textAlign: 'center',
                    padding: '8px 0',
                    fontSize: '13px',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isSelected ? 'var(--accent-primary, #e50914)' : 'transparent',
                    color: isDisabled ? 'rgba(255,255,255,0.2)' : isSelected ? '#ffffff' : 'var(--text-primary, #ffffff)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    opacity: isDisabled ? 0.35 : 1,
                    boxShadow: isSelected ? '0 4px 12px rgba(229, 9, 20, 0.4)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'rgba(229, 9, 20, 0.15)';
                      e.currentTarget.style.color = 'var(--accent-primary, #e50914)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-primary, #ffffff)';
                    }
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleYesterday}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #e50914)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              Yesterday
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes calendarFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PremiumDatePicker;
