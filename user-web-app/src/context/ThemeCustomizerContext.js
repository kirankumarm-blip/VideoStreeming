import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeCustomizerContext = createContext();

export const DEFAULT_THEME_SETTINGS = {
  mode: 'dark', // 'light' | 'dark'
  colorTheme: '#2563eb', // primary circle swatch
  boxAccent: '#3b49df', // box / surface accent
  palette: {
    primary: '#2563eb',
    secondary: '#475569',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626'
  },
  fontFamily: 'Roboto', // 'Roboto', 'Inter', 'Poppins', 'Open Sans', 'Montserrat', 'System'
  fontSize: 'default', // 'small', 'default', 'large', 'larger'
  screenIds: false
};

export const COLOR_THEME_PRESETS = [
  { id: 'blue', color: '#2563eb', name: 'Royal Blue' },
  { id: 'indigo', color: '#4f46e5', name: 'Indigo' },
  { id: 'purple', color: '#8b5cf6', name: 'Purple' },
  { id: 'teal', color: '#0d9488', name: 'Teal' },
  { id: 'emerald', color: '#059669', name: 'Emerald' },
  { id: 'slate', color: '#334155', name: 'Slate' },
  { id: 'rose', color: '#e11d48', name: 'Rose' },
  { id: 'amber', color: '#d97706', name: 'Amber' }
];

export const BOX_ACCENTS = [
  '#334155', // Dark Slate
  '#3b49df', // Indigo
  '#15803d', // Forest Green
  '#0f766e', // Dark Teal
  '#854d0e', // Warm Amber/Brown
  '#9f1239', // Deep Crimson
  '#6d28d9', // Deep Purple
  '#374151'  // Charcoal
];

export const PALETTE_OPTIONS = {
  primary: ['#2563eb', '#4f46e5', '#8b5cf6', '#0d9488', '#059669', '#334155', '#1d4ed8'],
  secondary: ['#475569', '#374151', '#4338ca', '#0f766e', '#3b82f6'],
  success: ['#16a34a', '#059669', '#0f766e', '#2563eb'],
  warning: ['#d97706', '#ea580c', '#ca8a04', '#2563eb'],
  error: ['#dc2626', '#e11d48', '#ea580c', '#2563eb']
};

export const FONT_FAMILIES = [
  { id: 'Roboto', name: 'Roboto (default)', css: "'Roboto', sans-serif" },
  { id: 'Inter', name: 'Inter', css: "'Inter', sans-serif" },
  { id: 'Poppins', name: 'Poppins', css: "'Poppins', sans-serif" },
  { id: 'Open Sans', name: 'Open Sans', css: "'Open Sans', sans-serif" },
  { id: 'Montserrat', name: 'Montserrat', css: "'Montserrat', sans-serif" },
  { id: 'Outfit', name: 'Outfit', css: "'Outfit', sans-serif" },
  { id: 'System', name: 'System Default', css: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
];

export const FONT_SIZES = [
  { id: 'small', label: 'Small', basePx: '13px', scale: 0.92 },
  { id: 'default', label: 'Default', basePx: '14.5px', scale: 1 },
  { id: 'large', label: 'Large', basePx: '16px', scale: 1.1 },
  { id: 'larger', label: 'Larger', basePx: '17.5px', scale: 1.2 }
];

export const ThemeCustomizerProvider = ({ children, externalTheme, setExternalTheme }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('theme_customizer_settings');
      if (saved) {
        return { ...DEFAULT_THEME_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not parse theme settings', e);
    }
    return {
      ...DEFAULT_THEME_SETTINGS,
      mode: externalTheme || localStorage.getItem('theme') || 'dark'
    };
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFullDrawerOpen, setIsFullDrawerOpen] = useState(false);

  // Sync mode if changed externally (e.g. from parent App)
  useEffect(() => {
    if (externalTheme && externalTheme !== settings.mode) {
      setSettings(prev => ({ ...prev, mode: externalTheme }));
    }
  }, [externalTheme]);

  // Apply settings to DOM and CSS root variables
  useEffect(() => {
    try {
      localStorage.setItem('theme_customizer_settings', JSON.stringify(settings));
      localStorage.setItem('theme', settings.mode);
    } catch (e) {}

    if (setExternalTheme) {
      setExternalTheme(settings.mode);
    }

    const root = document.documentElement;
    const body = document.body;

    // 1. Mode class
    if (settings.mode === 'light') {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    } else {
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
    }

    const primaryColor = settings.palette?.primary || settings.colorTheme || '#2563eb';
    const secondaryColor = settings.palette?.secondary || '#8b5cf6';
    const boxAccent = settings.boxAccent || '#3b49df';
    const successColor = settings.palette?.success || '#16a34a';
    const warningColor = settings.palette?.warning || '#d97706';
    const errorColor = settings.palette?.error || '#dc2626';

    const selectedFont = FONT_FAMILIES.find(f => f.id === settings.fontFamily) || FONT_FAMILIES[0];
    const selectedSize = FONT_SIZES.find(s => s.id === settings.fontSize) || FONT_SIZES[1];

    // 2. Palette CSS Variables directly on elements
    root.style.setProperty('--accent-primary', primaryColor);
    root.style.setProperty('--accent-secondary', secondaryColor);
    root.style.setProperty('--box-accent', boxAccent);
    root.style.setProperty('--color-success', successColor);
    root.style.setProperty('--color-warning', warningColor);
    root.style.setProperty('--color-error', errorColor);
    root.style.setProperty('--accent-glow', `${primaryColor}40`);
    root.style.setProperty('--menu-active-color', primaryColor);
    root.style.setProperty('--font-family-base', selectedFont.css);
    root.style.setProperty('--base-font-size', selectedSize.basePx);
    root.style.setProperty('--font-scale', selectedSize.scale);

    body.style.fontFamily = selectedFont.css;
    root.style.fontSize = selectedSize.basePx;

    // 3. Inject / Update Dynamic High-Priority StyleSheet to guarantee immediate live updates
    let styleTag = document.getElementById('dynamic-theme-customizer');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-theme-customizer';
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      :root, html, body, body.light-theme, body.dark-theme {
        --accent-primary: ${primaryColor} !important;
        --accent-secondary: ${secondaryColor} !important;
        --box-accent: ${boxAccent} !important;
        --color-success: ${successColor} !important;
        --color-warning: ${warningColor} !important;
        --color-error: ${errorColor} !important;
        --menu-active-color: ${primaryColor} !important;
        --menu-active-bg: ${primaryColor}22 !important;
        --accent-glow: ${primaryColor}40 !important;
        --font-family-base: ${selectedFont.css} !important;
        --base-font-size: ${selectedSize.basePx} !important;
      }

      /* Global typography override */
      *, html, body, div, p, span, h1, h2, h3, h4, h5, h6, a, button, input, select, textarea, label {
        font-family: ${selectedFont.css} !important;
      }

      html, body {
        font-size: ${selectedSize.basePx} !important;
      }

      /* Dynamic Box Accent Tinting across cards and containers */
      .glass-card, .dashboard-card, .video-card, .plan-card, .quiz-card, .stat-card, .cert-card {
        border-color: ${boxAccent}50 !important;
      }

      /* Sidebar & active navigation items */
      .nav-item.active, .sidebar-item.active, .premium-sidebar-item.active {
        background: ${boxAccent}26 !important;
        border-left: 3px solid ${primaryColor} !important;
        color: ${primaryColor} !important;
      }

      .nav-item.active svg, .sidebar-item.active svg, .premium-sidebar-item.active svg {
        color: ${primaryColor} !important;
      }

      /* Primary buttons & CTA buttons */
      .btn-primary, button.primary-btn, .primary-button {
        background-color: ${primaryColor} !important;
        border-color: ${primaryColor} !important;
        color: #ffffff !important;
      }

      /* Interactive links, tags and chips */
      .category-chip.active, .tab.active, .active-tab {
        background-color: ${primaryColor} !important;
        color: #ffffff !important;
        border-color: ${primaryColor} !important;
      }

      /* Focus outlines */
      input:focus, select:focus, textarea:focus {
        border-color: ${primaryColor} !important;
        box-shadow: 0 0 0 2px ${primaryColor}30 !important;
      }
    `;

  }, [settings, setExternalTheme]);

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });
  };

  const updatePaletteColor = (paletteKey, color) => {
    setSettings(prev => ({
      ...prev,
      palette: {
        ...prev.palette,
        [paletteKey]: color
      },
      // If primary updated, sync colorTheme as well
      ...(paletteKey === 'primary' ? { colorTheme: color } : {})
    }));
  };

  const resetToDefault = () => {
    setSettings(DEFAULT_THEME_SETTINGS);
  };

  return (
    <ThemeCustomizerContext.Provider value={{
      settings,
      updateSetting,
      updatePaletteColor,
      resetToDefault,
      isPopoverOpen,
      setIsPopoverOpen,
      isFullDrawerOpen,
      setIsFullDrawerOpen
    }}>
      {children}
    </ThemeCustomizerContext.Provider>
  );
};

export const useThemeCustomizer = () => {
  const context = useContext(ThemeCustomizerContext);
  if (!context) {
    throw new Error('useThemeCustomizer must be used within ThemeCustomizerProvider');
  }
  return context;
};
