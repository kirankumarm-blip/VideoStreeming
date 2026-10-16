import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useThemeCustomizer,
  COLOR_THEME_PRESETS,
  BOX_ACCENTS,
  PALETTE_OPTIONS,
  FONT_FAMILIES,
  FONT_SIZES
} from '../context/ThemeCustomizerContext';

// Helper to derive a clean Screen ID based on route
const getScreenId = (pathname) => {
  if (!pathname || pathname === '/') return 'SCR-ADMIN-01';
  if (pathname.includes('/super-admin')) return 'SCR-SADMIN-02';
  if (pathname.includes('/live-webcasts')) return 'SCR-CAST-03';
  if (pathname.includes('/profile')) return 'SCR-PROF-04';
  if (pathname.includes('/login')) return 'SCR-AUTH-05';
  return `SCR-${pathname.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'STUDIO'}`;
};

export const AppearancePopover = ({ anchorRef }) => {
  const {
    settings,
    updateSetting,
    updatePaletteColor,
    resetToDefault,
    isPopoverOpen,
    setIsPopoverOpen,
    setIsFullDrawerOpen
  } = useThemeCustomizer();

  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isPopoverOpen, anchorRef, setIsPopoverOpen]);

  if (!isPopoverOpen) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: '46px',
        right: '0px',
        width: '320px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
        padding: '20px',
        zIndex: 2500,
        color: 'var(--text-primary)',
        backdropFilter: 'blur(20px)',
        animation: 'popoverFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Header: Title & Reset */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.8px',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase'
        }}>
          APPEARANCE
        </span>
        <button
          onClick={resetToDefault}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '4px',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
        >
          <span style={{ fontSize: '13px' }}>↺</span> Reset
        </button>
      </div>

      {/* Mode: Light / Dark Toggle */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Mode
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'var(--bg-tertiary)',
          padding: '3px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            onClick={() => updateSetting('mode', 'light')}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: settings.mode === 'light' ? 'var(--bg-secondary)' : 'transparent',
              color: settings.mode === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: settings.mode === 'light' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>☀️</span> Light
          </button>
          <button
            type="button"
            onClick={() => updateSetting('mode', 'dark')}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: settings.mode === 'dark' ? 'var(--bg-secondary)' : 'transparent',
              color: settings.mode === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: settings.mode === 'dark' ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🌙</span> Dark
          </button>
        </div>
      </div>

      {/* Colour theme (circle swatches) */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Colour theme
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {COLOR_THEME_PRESETS.map((preset) => {
            const isSelected = (settings.colorTheme || '').toLowerCase() === preset.color.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  updateSetting('colorTheme', preset.color);
                  updatePaletteColor('primary', preset.color);
                }}
                title={preset.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: preset.color,
                  border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                  boxShadow: isSelected ? `0 0 0 2px ${preset.color}` : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 900,
                  transition: 'transform 0.12s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {isSelected && '✓'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Box Accent (rounded square swatches) */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Box accent
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
          {BOX_ACCENTS.map((color, idx) => {
            const isSelected = (settings.boxAccent || '').toLowerCase() === color.toLowerCase();
            return (
              <button
                key={idx}
                type="button"
                onClick={() => updateSetting('boxAccent', color)}
                style={{
                  height: '32px',
                  borderRadius: '8px',
                  background: color,
                  border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: isSelected ? `0 0 0 2px ${color}` : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 900,
                  transition: 'transform 0.12s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.08)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {isSelected && '✓'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size (A A A A segmented cards) */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: '8px'
        }}>
          <span>𝖳</span> Font size
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--bg-tertiary)',
          padding: '3px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          gap: '2px'
        }}>
          {FONT_SIZES.map((sizeOption, idx) => {
            const isSelected = settings.fontSize === sizeOption.id;
            const fontSizesPx = ['12px', '14px', '16px', '18px'];
            return (
              <button
                key={sizeOption.id}
                type="button"
                onClick={() => updateSetting('fontSize', sizeOption.id)}
                style={{
                  height: '36px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: fontSizesPx[idx],
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                A
              </button>
            );
          })}
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
          marginTop: '6px',
          fontWeight: 600
        }}>
          {FONT_SIZES.find(s => s.id === settings.fontSize)?.label || 'Default'}
        </div>
      </div>

      {/* Screen IDs toggle switch */}
      <div style={{
        paddingTop: '12px',
        borderTop: '1px solid var(--border-color)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            <span style={{ color: 'var(--text-secondary)' }}>#</span> Screen IDs
          </div>
          {/* iOS-Style Toggle Switch */}
          <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '24px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={Boolean(settings.screenIds)}
              onChange={(e) => updateSetting('screenIds', e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: settings.screenIds ? 'var(--accent-primary, #2563eb)' : '#475569',
              borderRadius: '24px',
              transition: '0.2s',
              display: 'block'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: settings.screenIds ? '21px' : '3px',
                bottom: '3px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: '0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </span>
          </label>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
          Show the SCR-... identifier chip on every screen.
        </div>
      </div>

      {/* Full customizer Button */}
      <button
        type="button"
        onClick={() => {
          setIsPopoverOpen(false);
          setIsFullDrawerOpen(true);
        }}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'var(--bg-secondary)';
          e.target.style.borderColor = 'var(--accent-primary, #2563eb)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'var(--bg-tertiary)';
          e.target.style.borderColor = 'var(--border-color)';
        }}
      >
        <span style={{ fontSize: '14px' }}>🎛️</span> Full customizer
      </button>
    </div>
  );
};

// =======================================================
// Full Theme Customizer Slide-out Drawer (Matching Image 2)
// =======================================================
export const ThemeCustomizerDrawer = () => {
  const {
    settings,
    updateSetting,
    updatePaletteColor,
    resetToDefault,
    isFullDrawerOpen,
    setIsFullDrawerOpen
  } = useThemeCustomizer();

  if (!isFullDrawerOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={() => setIsFullDrawerOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 3500,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Slide-out Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          maxWidth: '90vw',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.3)',
          zIndex: 3600,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>✨</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Theme Customizer
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={resetToDefault}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>↺</span> Reset
            </button>
            <button
              type="button"
              onClick={() => setIsFullDrawerOpen(false)}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Customizer Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Mode */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '10px'
            }}>
              <span>☀️</span> Mode
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--bg-tertiary)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => updateSetting('mode', 'light')}
                style={{
                  padding: '9px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: settings.mode === 'light' ? 'var(--bg-secondary)' : 'transparent',
                  color: settings.mode === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: settings.mode === 'light' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => updateSetting('mode', 'dark')}
                style={{
                  padding: '9px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: settings.mode === 'dark' ? 'var(--bg-secondary)' : 'transparent',
                  color: settings.mode === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: settings.mode === 'dark' ? '0 2px 6px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Colour theme */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '10px'
            }}>
              <span>🎨</span> Colour theme
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {COLOR_THEME_PRESETS.map((preset) => {
                const isSelected = (settings.colorTheme || '').toLowerCase() === preset.color.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      updateSetting('colorTheme', preset.color);
                      updatePaletteColor('primary', preset.color);
                    }}
                    title={preset.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: preset.color,
                      border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                      boxShadow: isSelected ? `0 0 0 2px ${preset.color}` : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 900
                    }}
                  >
                    {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Box / surface accent */}
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '10px'
            }}>
              Box / surface accent
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
              {BOX_ACCENTS.map((color, idx) => {
                const isSelected = (settings.boxAccent || '').toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => updateSetting('boxAccent', color)}
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      background: color,
                      border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 0 2px ${color}` : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 900
                    }}
                  >
                    {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

          {/* PALETTE COLOURS */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              textTransform: 'uppercase'
            }}>
              PALETTE COLOURS
            </div>

            {/* Primary */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Primary
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PALETTE_OPTIONS.primary.map((col, idx) => {
                  const isSelected = (settings.palette?.primary || '').toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updatePaletteColor('primary', col)}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: col,
                        border: isSelected ? '2px solid #ffffff' : 'none',
                        boxShadow: isSelected ? `0 0 0 2px ${col}` : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Secondary */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Secondary
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PALETTE_OPTIONS.secondary.map((col, idx) => {
                  const isSelected = (settings.palette?.secondary || '').toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updatePaletteColor('secondary', col)}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: col,
                        border: isSelected ? '2px solid #ffffff' : 'none',
                        boxShadow: isSelected ? `0 0 0 2px ${col}` : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Success */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Success
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PALETTE_OPTIONS.success.map((col, idx) => {
                  const isSelected = (settings.palette?.success || '').toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updatePaletteColor('success', col)}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: col,
                        border: isSelected ? '2px solid #ffffff' : 'none',
                        boxShadow: isSelected ? `0 0 0 2px ${col}` : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Warning */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Warning
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PALETTE_OPTIONS.warning.map((col, idx) => {
                  const isSelected = (settings.palette?.warning || '').toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updatePaletteColor('warning', col)}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: col,
                        border: isSelected ? '2px solid #ffffff' : 'none',
                        boxShadow: isSelected ? `0 0 0 2px ${col}` : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Error */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Error
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PALETTE_OPTIONS.error.map((col, idx) => {
                  const isSelected = (settings.palette?.error || '').toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updatePaletteColor('error', col)}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: col,
                        border: isSelected ? '2px solid #ffffff' : 'none',
                        boxShadow: isSelected ? `0 0 0 2px ${col}` : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

          {/* TYPOGRAPHY */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              textTransform: 'uppercase'
            }}>
              TYPOGRAPHY
            </div>

            {/* Font Family Dropdown */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                <span>𝖳</span> Font family
              </div>
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSetting('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.id} value={font.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font size segmented buttons */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Font size
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                background: 'var(--bg-tertiary)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                gap: '4px'
              }}>
                {FONT_SIZES.map((size) => {
                  const isSelected = settings.fontSize === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => updateSetting('fontSize', size.id)}
                      style={{
                        padding: '9px 4px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Side Floating Audit Tab Tag as shown in image 2 */}
        <div
          style={{
            position: 'absolute',
            top: '52%',
            left: '-32px',
            background: 'var(--accent-primary, #1e3a8a)',
            color: '#ffffff',
            padding: '12px 6px',
            borderRadius: '8px 0 0 8px',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
            boxShadow: '-3px 4px 10px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'default',
            pointerEvents: 'none'
          }}
        >
          <span>AUDIT</span>
          <span style={{ fontSize: '12px', transform: 'rotate(90deg)' }}>🕒</span>
        </div>
      </div>
    </>
  );
};

// =======================================================
// Screen IDs Floating Identifier Chip
// =======================================================
export const ScreenIdChip = () => {
  const { settings } = useThemeCustomizer();
  const location = useLocation();

  if (!settings.screenIds) return null;

  const currentScreenId = getScreenId(location.pathname);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.88)',
        color: '#38bdf8',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        padding: '5px 12px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'monospace',
        letterSpacing: '0.6px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        pointerEvents: 'none',
        animation: 'fadeIn 0.2s ease-in'
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
      #{currentScreenId}
    </div>
  );
};
