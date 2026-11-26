import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode
} from 'libphonenumber-js';

// Safe Flag Emoji Generator from ISO-3166-1 alpha-2 code
export const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Priority/Popular Countries shown at the top of the list
const PRIORITY_COUNTRY_CODES = ['IN', 'US', 'GB', 'AE', 'CA', 'AU', 'SG', 'DE', 'SA', 'QA', 'FR', 'JP', 'ZA'];

// Shared dial code default mappings
const CALLING_CODE_DEFAULTS = {
  '1': 'US',
  '44': 'GB',
  '7': 'RU',
  '61': 'AU'
};

/**
 * Generate sorted country dataset
 */
export const buildCountryList = () => {
  let displayNames = null;
  try {
    displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch (e) {
    displayNames = null;
  }

  const rawCodes = getCountries();
  const list = rawCodes.map((code) => {
    let name = code;
    if (displayNames) {
      try {
        name = displayNames.of(code) || code;
      } catch (e) {
        name = code;
      }
    }
    let dialCode = '+1';
    try {
      dialCode = '+' + getCountryCallingCode(code);
    } catch (e) {
      dialCode = '';
    }
    return {
      code,
      name,
      dialCode,
      flag: getFlagEmoji(code)
    };
  });

  // Separate priority and remaining
  const priorityList = [];
  const remainingList = [];

  PRIORITY_COUNTRY_CODES.forEach((pCode) => {
    const found = list.find((c) => c.code === pCode);
    if (found) priorityList.push(found);
  });

  list.forEach((c) => {
    if (!PRIORITY_COUNTRY_CODES.includes(c.code)) {
      remainingList.push(c);
    }
  });

  remainingList.sort((a, b) => a.name.localeCompare(b.name));

  return {
    all: list,
    priority: priorityList,
    remaining: remainingList
  };
};

/**
 * Validate phone number using libphonenumber-js and E.164 rules
 */
export function validateInternationalPhoneNumber(nationalNumber, countryCode = 'IN', countryName = 'India') {
  if (!nationalNumber || !String(nationalNumber).trim()) {
    return { isValid: false, error: 'Please fill out phone number' };
  }

  const trimmed = String(nationalNumber).trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly) {
    return { isValid: false, error: 'Please enter a valid phone number containing digits' };
  }

  let callingCode = '91';
  try {
    callingCode = getCountryCallingCode(countryCode);
  } catch (e) {
    callingCode = '';
  }

  // Total digits check (E.164 max 15 digits)
  const totalDigits = callingCode + digitsOnly;
  if (totalDigits.length > 15) {
    return {
      isValid: false,
      error: 'Phone number exceeds the maximum international limit of 15 digits (E.164)'
    };
  }

  // Parse with libphonenumber-js
  let phoneNumber;
  try {
    phoneNumber = parsePhoneNumberFromString(trimmed, countryCode);
  } catch (e) {
    return { isValid: false, error: 'Invalid phone number format' };
  }

  if (!phoneNumber || !phoneNumber.isValid()) {
    return {
      isValid: false,
      error: `Please enter a valid phone number for ${countryName}`
    };
  }

  const e164 = phoneNumber.format('E.164');
  if (e164.replace(/\D/g, '').length > 15) {
    return {
      isValid: false,
      error: 'Phone number exceeds the maximum international limit of 15 digits (E.164)'
    };
  }

  return {
    isValid: true,
    e164,
    nationalNumber: phoneNumber.nationalNumber,
    country: phoneNumber.country
  };
}

/**
 * Detect pasted international number and extract country + national number
 */
export function parsePastedInternationalNumber(text, currentCountryCode = 'IN') {
  if (!text) return null;
  let clean = text.trim();

  // If text starts with 00 (common international exit code), replace with +
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2);
  }

  if (clean.startsWith('+')) {
    try {
      const parsed = parsePhoneNumberFromString(clean);
      if (parsed) {
        let country = parsed.country;
        if (!country && parsed.countryCallingCode) {
          country = CALLING_CODE_DEFAULTS[parsed.countryCallingCode] || currentCountryCode;
        } else if (parsed.countryCallingCode) {
          try {
            if (getCountryCallingCode(currentCountryCode) === parsed.countryCallingCode) {
              country = currentCountryCode;
            }
          } catch (e) {}
        }
        return {
          countryCode: country || currentCountryCode,
          callingCode: '+' + parsed.countryCallingCode,
          nationalNumber: parsed.nationalNumber
        };
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Resolve country object from ISO code or phone number
 */
export function resolveInitialCountry(countryIso, phoneNumber, defaultCountry = { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' }) {
  try {
    const countryList = buildCountryList();
    if (countryIso && typeof countryIso === 'string') {
      const found = countryList.all.find(c => c.code.toUpperCase() === countryIso.trim().toUpperCase());
      if (found) return found;
    }
    if (phoneNumber && String(phoneNumber).trim().startsWith('+')) {
      const detected = parsePastedInternationalNumber(String(phoneNumber).trim());
      if (detected) {
        const found = countryList.all.find(c => c.code === detected.countryCode);
        if (found) return found;
      }
    }
  } catch (e) {
    // fallback
  }
  return defaultCountry;
}

const InternationalPhoneInput = ({
  selectedCountry = { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' },
  onCountryChange,
  value = '',
  onChange,
  placeholder = 'Enter phone number',
  disabled = false,
  required = false,
  id = 'phone-input',
  name = 'mobile'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  const countryData = useMemo(() => buildCountryList(), []);

  // Filter countries by search query (matches name, dial code, or country code)
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        priority: countryData.priority,
        remaining: countryData.remaining
      };
    }
    const matches = (c) =>
      c.name.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q);

    return {
      priority: countryData.priority.filter(matches),
      remaining: countryData.remaining.filter(matches)
    };
  }, [countryData, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on dropdown open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelectCountry = (country) => {
    if (onCountryChange) {
      onCountryChange(country);
    }
    setIsOpen(false);
    setSearchQuery('');
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  };

  // Handle typing inside national phone input
  const handleInputChange = (e) => {
    const rawVal = e.target.value;

    // If user starts typing '+' in national input, check if it's an international prefix
    if (rawVal.trim().startsWith('+')) {
      const detected = parsePastedInternationalNumber(rawVal, selectedCountry.code);
      if (detected) {
        const found = countryData.all.find((c) => c.code === detected.countryCode);
        if (found && onCountryChange) {
          onCountryChange(found);
        }
        if (onChange) {
          onChange({
            target: {
              name,
              value: detected.nationalNumber
            }
          });
        }
        return;
      }
    }

    // Allow digits, spaces, hyphens, and parentheses during editing
    // Prevent non-phone characters, but never silently truncate valid lengths
    const sanitized = rawVal.replace(/[^0-9\s\-().]/g, '');

    if (onChange) {
      onChange({
        target: {
          name,
          value: sanitized
        }
      });
    }
  };

  // Handle paste events with international prefix detection
  const handlePaste = (e) => {
    const pastedText = e.clipboardData ? e.clipboardData.getData('text') : '';
    if (!pastedText) return;

    const detected = parsePastedInternationalNumber(pastedText, selectedCountry.code);
    if (detected) {
      e.preventDefault();
      const found = countryData.all.find((c) => c.code === detected.countryCode);
      if (found && onCountryChange) {
        onCountryChange(found);
      }
      if (onChange) {
        onChange({
          target: {
            name,
            value: detected.nationalNumber
          }
        });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="international-phone-input-root"
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        gap: '10px',
        alignItems: 'stretch'
      }}
    >
      {/* Dynamic Scoped CSS for Theme & High-Contrast Readability */}
      <style>{`
        .intl-phone-dropdown {
          background-color: var(--bg-card, #ffffff) !important;
          border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12)) !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--border-color, rgba(0, 0, 0, 0.06)) !important;
        }
        .intl-phone-search-wrapper {
          background-color: var(--bg-card, #ffffff) !important;
          border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.08)) !important;
        }
        .intl-phone-search-input {
          background-color: var(--bg-tertiary, #f1f5f9) !important;
          border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12)) !important;
          color: var(--text-primary, #0f172a) !important;
        }
        .intl-phone-search-input::placeholder {
          color: var(--text-secondary, #64748b) !important;
        }
        .intl-country-item {
          color: var(--text-primary, #0f172a) !important;
          transition: background-color 0.15s ease, color 0.15s ease;
          border-radius: 8px;
          margin: 1px 6px;
        }
        .intl-country-item:hover {
          background-color: var(--menu-active-bg, rgba(124, 58, 237, 0.1)) !important;
        }
        .intl-country-item.selected {
          background-color: var(--menu-active-bg, rgba(124, 58, 237, 0.18)) !important;
        }
        .intl-country-item .country-name {
          color: var(--text-primary, #0f172a) !important;
        }
        .intl-country-item.selected .country-name {
          color: var(--accent-secondary, #7c3aed) !important;
          font-weight: 600 !important;
        }
        .intl-country-item .dial-code {
          color: var(--text-secondary, #64748b) !important;
        }
        .intl-country-item.selected .dial-code {
          color: var(--accent-secondary, #7c3aed) !important;
          font-weight: 600 !important;
        }
        .intl-section-header {
          color: var(--text-secondary, #64748b) !important;
        }
      `}</style>

      {/* Country Selector Trigger */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="country-picker-trigger-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 14px',
            backgroundColor: 'var(--input-bg, #ffffff)',
            border: isOpen
              ? '1px solid var(--accent-secondary, #7c3aed)'
              : '1px solid var(--border-color, rgba(0, 0, 0, 0.12))',
            borderRadius: '12px',
            color: 'var(--text-primary, #0f172a)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none',
            height: '100%',
            boxShadow: isOpen
              ? '0 0 0 1px var(--accent-secondary, #7c3aed), 0 0 16px rgba(139, 92, 246, 0.25)'
              : 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: '115px'
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>{selectedCountry.flag}</span>
          <span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>{selectedCountry.dialCode}</span>
          <i
            className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary, #64748b)',
              marginLeft: '2px',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div
            className="intl-phone-dropdown"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 9999,
              width: '320px',
              maxWidth: '90vw',
              borderRadius: '12px',
              overflow: 'hidden',
              backdropFilter: 'blur(16px)',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            {/* Search Input Header */}
            <div
              className="intl-phone-search-wrapper"
              style={{
                padding: '10px 12px'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%'
                }}
              >
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: 'var(--text-secondary, #64748b)',
                    fontSize: '12px'
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search country or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                  className="intl-phone-search-input"
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Scrollable Countries List */}
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '6px 0'
              }}
            >
              {filteredCountries.priority.length === 0 &&
              filteredCountries.remaining.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #64748b)',
                    fontSize: '13px'
                  }}
                >
                  No matching countries
                </div>
              ) : (
                <>
                  {/* Priority / Popular Countries */}
                  {filteredCountries.priority.length > 0 && (
                    <div>
                      {!searchQuery && (
                        <div
                          className="intl-section-header"
                          style={{
                            padding: '6px 14px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.6px',
                            textTransform: 'uppercase'
                          }}
                        >
                          Popular Countries
                        </div>
                      )}
                      {filteredCountries.priority.map((country) => {
                        const isSelected = selectedCountry.code === country.code;
                        return (
                          <div
                            key={'p-' + country.code}
                            onClick={() => handleSelectCountry(country)}
                            className={`intl-country-item ${isSelected ? 'selected' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '18px', lineHeight: 1 }}>{country.flag}</span>
                              <span
                                className="country-name"
                                style={{
                                  fontSize: '14px',
                                  fontWeight: isSelected ? 600 : 400
                                }}
                              >
                                {country.name}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className="dial-code"
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 500
                                }}
                              >
                                {country.dialCode}
                              </span>
                              {isSelected && (
                                <i
                                  className="fa-solid fa-check"
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--accent-secondary, #7c3aed)'
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Remaining / All Countries */}
                  {filteredCountries.remaining.length > 0 && (
                    <div>
                      {!searchQuery && filteredCountries.priority.length > 0 && (
                        <div
                          className="intl-section-header"
                          style={{
                            padding: '10px 14px 4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.6px',
                            textTransform: 'uppercase',
                            borderTop: '1px solid var(--border-color, rgba(0, 0, 0, 0.06))',
                            marginTop: '4px'
                          }}
                        >
                          All Countries
                        </div>
                      )}
                      {filteredCountries.remaining.map((country) => {
                        const isSelected = selectedCountry.code === country.code;
                        return (
                          <div
                            key={'r-' + country.code}
                            onClick={() => handleSelectCountry(country)}
                            className={`intl-country-item ${isSelected ? 'selected' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '18px', lineHeight: 1 }}>{country.flag}</span>
                              <span
                                className="country-name"
                                style={{
                                  fontSize: '14px',
                                  fontWeight: isSelected ? 600 : 400
                                }}
                              >
                                {country.name}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className="dial-code"
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 500
                                }}
                              >
                                {country.dialCode}
                              </span>
                              {isSelected && (
                                <i
                                  className="fa-solid fa-check"
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--accent-secondary, #7c3aed)'
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* National Phone Input */}
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          ref={phoneInputRef}
          id={id}
          name={name}
          type="tel"
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onPaste={handlePaste}
          disabled={disabled}
          required={required}
          onInvalid={(e) => e.target.setCustomValidity('Please fill out phone number')}
          onInput={(e) => e.target.setCustomValidity('')}
          style={{ width: '100%' }}
          autoComplete="tel-national"
        />
      </div>
    </div>
  );
};

export default InternationalPhoneInput;
