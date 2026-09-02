import React, { useState, useRef, useEffect } from 'react';

const PremiumSelect = ({
  options = [],
  value,
  onChange,
  onOpen,
  placeholder = "Select Option...",
  disabled = false,
  searchable = true,
  className = "",
  style = {},
  icon = "fa-solid fa-list",
  label = "",
  size = "default",
  dropUp = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [autoDropUp, setAutoDropUp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (dropUp || spaceBelow < 220) {
        setAutoDropUp(true);
      } else {
        setAutoDropUp(false);
      }
    }
  }, [isOpen, dropUp]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format options normalized: { id, label, icon }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      const rawId = opt.id !== undefined && opt.id !== null ? opt.id : (opt.value !== undefined && opt.value !== null ? opt.value : (opt.code !== undefined && opt.code !== null ? opt.code : opt.name));
      const rawLabel = opt.name !== undefined && opt.name !== null ? opt.name : (opt.title !== undefined && opt.title !== null ? opt.title : (opt.label !== undefined && opt.label !== null ? opt.label : String(rawId)));
      return {
        id: String(rawId !== undefined && rawId !== null ? rawId : ''),
        label: String(rawLabel),
        icon: opt.icon || opt.iconClass || null,
        subLabel: opt.description || opt.subLabel || null
      };
    }
    return { id: String(opt), label: String(opt), icon: null };
  });

  const selectedOption = normalizedOptions.find(opt => 
    String(opt.id).toLowerCase() === String(value || '').toLowerCase() || 
    String(opt.label).toLowerCase() === String(value || '').toLowerCase()
  );

  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (opt) => {
    onChange({ target: { value: opt.id, name: label } });
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={dropdownRef} className={`premium-select-container ${className}`} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            const nextState = !isOpen;
            setIsOpen(nextState);
            if (nextState && typeof onOpen === 'function') {
              onOpen();
            }
          }
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          backgroundColor: 'var(--input-bg, rgba(255,255,255,0.04))',
          border: isOpen ? '1px solid var(--accent-secondary, #7c3aed)' : '1px solid var(--border-color, rgba(0,0,0,0.12))',
          borderRadius: '12px',
          color: selectedOption ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #94a3b8)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 1px var(--accent-secondary, #7c3aed), 0 0 16px rgba(139, 92, 246, 0.25)' : 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          {selectedOption?.icon ? (
            <i className={selectedOption.icon} style={{ color: 'var(--accent-secondary, #7c3aed)', fontSize: '14px' }}></i>
          ) : icon ? (
            <i className={icon} style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '13px' }}></i>
          ) : null}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <svg
          width={size === 'small' ? "11" : "13"}
          height={size === 'small' ? "11" : "13"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: isOpen ? 'var(--accent-secondary, #7c3aed)' : 'var(--text-secondary, #94a3b8)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
            marginLeft: size === 'small' ? '4px' : '6px',
            flexShrink: 0
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {/* Floating Menu Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: (dropUp || autoDropUp) ? 'auto' : 'calc(100% + 6px)',
          bottom: (dropUp || autoDropUp) ? 'calc(100% + 6px)' : 'auto',
          left: 0,
          right: 0,
          minWidth: '100%',
          zIndex: 9999,
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, rgba(0,0,0,0.12))',
          borderRadius: '12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          animation: 'dropdownFadeIn 0.2s ease-out'
        }}>
          {searchable && normalizedOptions.length > 5 && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}></i>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    color: 'var(--text-primary, #ffffff)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.id) === String(value);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: isSelected ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary, #e50914)' : 'var(--text-primary, #1e293b)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                      marginBottom: '2px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isSelected ? 'rgba(229, 9, 20, 0.25)' : 'rgba(229, 9, 20, 0.12)';
                      e.currentTarget.style.color = 'var(--accent-primary, #e50914)';
                      e.currentTarget.style.boxShadow = 'inset 3px 0 0 var(--accent-primary, #e50914)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isSelected ? 'rgba(229, 9, 20, 0.18)' : 'transparent';
                      e.currentTarget.style.color = isSelected ? 'var(--accent-primary, #e50914)' : 'var(--text-primary, #1e293b)';
                      e.currentTarget.style.boxShadow = isSelected ? 'inset 3px 0 0 var(--accent-primary, #e50914)' : 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {opt.icon && <i className={opt.icon} style={{ fontSize: '13px' }}></i>}
                      <div>
                        <div>{opt.label}</div>
                        {opt.subLabel && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{opt.subLabel}</div>}
                      </div>
                    </div>
                    {isSelected && <i className="fa-solid fa-check" style={{ fontSize: '12px' }}></i>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PremiumSelect;
