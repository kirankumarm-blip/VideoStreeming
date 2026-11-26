/**
 * Country-Aware Postal Code / Zipcode Validator
 * Validates postal code formatting based on country ISO alpha-2 code
 * with clear, actionable validation error messages.
 */

export const POSTAL_CODE_PATTERNS = {
  IN: {
    pattern: /^[1-9][0-9]{5}$/,
    format: '6 digits (e.g. 560001)',
    example: '560001',
    placeholder: '6-digit PIN code'
  },
  US: {
    pattern: /^\d{5}(-\d{4})?$/,
    format: '5 digits or 5+4 format (e.g. 90210 or 90210-1234)',
    example: '90210',
    placeholder: '5-digit ZIP (e.g. 90210)'
  },
  GB: {
    pattern: /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i,
    format: 'UK format (e.g. SW1A 1AA)',
    example: 'SW1A 1AA',
    placeholder: 'UK postal code (e.g. SW1A 1AA)'
  },
  CA: {
    pattern: /^[A-CEGHJ-NPR-TVXY][0-9][A-CEGHJ-NPR-TV-Z]\s?[0-9][A-CEGHJ-NPR-TV-Z][0-9]$/i,
    format: 'Canadian format (e.g. K1A 0B1)',
    example: 'K1A 0B1',
    placeholder: 'Canadian postal code (e.g. K1A 0B1)'
  },
  AU: {
    pattern: /^\d{4}$/,
    format: '4 digits (e.g. 2000)',
    example: '2000',
    placeholder: '4-digit postcode (e.g. 2000)'
  },
  DE: {
    pattern: /^\d{5}$/,
    format: '5 digits (e.g. 10115)',
    example: '10115',
    placeholder: '5-digit PLZ (e.g. 10115)'
  },
  FR: {
    pattern: /^\d{5}$/,
    format: '5 digits (e.g. 75001)',
    example: '75001',
    placeholder: '5-digit postal code (e.g. 75001)'
  },
  IT: {
    pattern: /^\d{5}$/,
    format: '5 digits (e.g. 00118)',
    example: '00118',
    placeholder: '5-digit CAP (e.g. 00118)'
  },
  ES: {
    pattern: /^\d{5}$/,
    format: '5 digits (e.g. 28001)',
    example: '28001',
    placeholder: '5-digit postal code (e.g. 28001)'
  },
  NL: {
    pattern: /^\d{4}\s?[A-Z]{2}$/i,
    format: '4 digits + 2 letters (e.g. 1012 AB)',
    example: '1012 AB',
    placeholder: 'e.g. 1012 AB'
  },
  SG: {
    pattern: /^\d{6}$/,
    format: '6 digits (e.g. 238858)',
    example: '238858',
    placeholder: '6-digit postal code'
  },
  JP: {
    pattern: /^\d{3}-?\d{4}$/,
    format: '7 digits (e.g. 100-0001)',
    example: '100-0001',
    placeholder: 'e.g. 100-0001'
  },
  BR: {
    pattern: /^\d{5}-?\d{3}$/,
    format: '8 digits (e.g. 01310-100)',
    example: '01310-100',
    placeholder: 'e.g. 01310-100'
  },
  ZA: {
    pattern: /^\d{4}$/,
    format: '4 digits (e.g. 2000)',
    example: '2000',
    placeholder: '4-digit postal code'
  },
  SA: {
    pattern: /^\d{5}(-\d{4})?$/,
    format: '5 digits or 5+4 format (e.g. 12211)',
    example: '12211',
    placeholder: '5-digit postal code'
  },
  AE: {
    pattern: /^[A-Z0-9\s-]{1,10}$/i,
    format: 'PO Box or postal code (e.g. 00000)',
    example: '00000',
    placeholder: 'PO Box or postal code'
  }
};

const GENERAL_POSTAL_REGEX = /^[A-Z0-9\s-]{3,10}$/i;

/**
 * Get dynamic placeholder string for a country's postal code input
 */
export function getPostalCodePlaceholder(countryCode = 'IN') {
  const upperCode = (countryCode || 'IN').toUpperCase();
  const rule = POSTAL_CODE_PATTERNS[upperCode];
  if (rule && rule.placeholder) {
    return rule.placeholder;
  }
  return 'Enter postal code';
}

/**
 * Validates postal code for a specified country
 * @param {string} postalCode - The user input postal code
 * @param {string} countryCode - ISO-3166-1 alpha-2 country code (e.g. 'IN', 'US', 'GB')
 * @param {string} countryName - Human-readable country name for error display (e.g. 'India')
 * @returns {{ isValid: boolean, error?: string, postalCode?: string }}
 */
export function validatePostalCode(postalCode, countryCode = 'IN', countryName = 'India') {
  if (!postalCode || !String(postalCode).trim()) {
    return { isValid: false, error: 'Please fill out zipcode' };
  }

  const trimmed = String(postalCode).trim();
  const upperCode = (countryCode || 'IN').toUpperCase();
  const rule = POSTAL_CODE_PATTERNS[upperCode];

  if (rule) {
    if (rule.pattern.test(trimmed)) {
      return { isValid: true, postalCode: trimmed };
    }
    return {
      isValid: false,
      error: `Please enter a valid postal code for ${countryName || upperCode} (${rule.format})`
    };
  }

  // Generic international fallback for countries not explicitly patterned
  if (GENERAL_POSTAL_REGEX.test(trimmed)) {
    return { isValid: true, postalCode: trimmed };
  }

  return {
    isValid: false,
    error: `Please enter a valid postal code for ${countryName || upperCode} (3 to 10 alphanumeric characters)`
  };
}

export default validatePostalCode;
