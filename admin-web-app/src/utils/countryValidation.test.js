import {
  validateInternationalPhoneNumber,
  parsePastedInternationalNumber,
  resolveInitialCountry,
  buildCountryList
} from '../components/InternationalPhoneInput';
import {
  validatePostalCode,
  getPostalCodePlaceholder,
  POSTAL_CODE_PATTERNS
} from './postalCodeValidator';

describe('Country-Aware Phone and Postal Code Validation', () => {
  describe('1. validateInternationalPhoneNumber', () => {
    test('validates Indian phone numbers correctly', () => {
      const valid = validateInternationalPhoneNumber('9876543210', 'IN', 'India');
      expect(valid.isValid).toBe(true);
      expect(valid.nationalNumber).toBe('9876543210');

      const invalid = validateInternationalPhoneNumber('12345', 'IN', 'India');
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toMatch(/Please enter a valid phone number for India/i);
    });

    test('validates US phone numbers correctly', () => {
      const validPlain = validateInternationalPhoneNumber('2025550123', 'US', 'United States');
      expect(validPlain.isValid).toBe(true);
      expect(validPlain.nationalNumber).toBe('2025550123');

      const validFormatted = validateInternationalPhoneNumber('(202) 555-0123', 'US', 'United States');
      expect(validFormatted.isValid).toBe(true);

      const invalidShort = validateInternationalPhoneNumber('5550123', 'US', 'United States');
      expect(invalidShort.isValid).toBe(false);
      expect(invalidShort.error).toMatch(/Please enter a valid phone number for United States/i);
    });

    test('validates UK phone numbers correctly', () => {
      const valid = validateInternationalPhoneNumber('7911123456', 'GB', 'United Kingdom');
      expect(valid.isValid).toBe(true);

      const invalid = validateInternationalPhoneNumber('123', 'GB', 'United Kingdom');
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toMatch(/Please enter a valid phone number for United Kingdom/i);
    });

    test('validates Canadian phone numbers correctly', () => {
      const valid = validateInternationalPhoneNumber('4165550199', 'CA', 'Canada');
      expect(valid.isValid).toBe(true);
    });

    test('validates Australian phone numbers correctly', () => {
      const valid = validateInternationalPhoneNumber('412345678', 'AU', 'Australia');
      expect(valid.isValid).toBe(true);
    });

    test('validates UAE phone numbers correctly', () => {
      const valid = validateInternationalPhoneNumber('501234567', 'AE', 'United Arab Emirates');
      expect(valid.isValid).toBe(true);
    });

    test('rejects empty, whitespace, or non-numeric inputs', () => {
      expect(validateInternationalPhoneNumber('', 'IN', 'India').isValid).toBe(false);
      expect(validateInternationalPhoneNumber('   ', 'IN', 'India').isValid).toBe(false);
      expect(validateInternationalPhoneNumber(null, 'IN', 'India').isValid).toBe(false);
      expect(validateInternationalPhoneNumber('abcdefghij', 'IN', 'India').isValid).toBe(false);
    });

    test('parses pasted numbers with international dialing codes', () => {
      const usPasted = parsePastedInternationalNumber('+1 202-555-0123');
      expect(usPasted).toBeDefined();
      expect(usPasted.countryCode).toBe('US');
      expect(usPasted.callingCode).toBe('+1');

      const ukPasted = parsePastedInternationalNumber('+44 20 7183 8750');
      expect(ukPasted).toBeDefined();
      expect(ukPasted.countryCode).toBe('GB');
      expect(ukPasted.callingCode).toBe('+44');
    });

    test('resolveInitialCountry resolves correctly from ISO code or phone', () => {
      const usByCode = resolveInitialCountry('US', null);
      expect(usByCode.code).toBe('US');
      expect(usByCode.dialCode).toBe('+1');

      const gbByPhone = resolveInitialCountry(null, '+44 20 7183 8750');
      expect(gbByPhone.code).toBe('GB');

      const defaultIndia = resolveInitialCountry(null, null);
      expect(defaultIndia.code).toBe('IN');
      expect(defaultIndia.dialCode).toBe('+91');
    });
  });

  describe('2. validatePostalCode', () => {
    test('validates Indian 6-digit PIN codes', () => {
      expect(validatePostalCode('560001', 'IN', 'India').isValid).toBe(true);
      expect(validatePostalCode('110001', 'IN', 'India').isValid).toBe(true);

      const invalid5 = validatePostalCode('56000', 'IN', 'India');
      expect(invalid5.isValid).toBe(false);
      expect(invalid5.error).toContain('India');
      expect(invalid5.error).toContain('6 digits');

      const invalidLetters = validatePostalCode('56000A', 'IN', 'India');
      expect(invalidLetters.isValid).toBe(false);
    });

    test('validates US 5-digit and ZIP+4 postal codes', () => {
      expect(validatePostalCode('90210', 'US', 'United States').isValid).toBe(true);
      expect(validatePostalCode('90210-1234', 'US', 'United States').isValid).toBe(true);

      const invalid3 = validatePostalCode('902', 'US', 'United States');
      expect(invalid3.isValid).toBe(false);
      expect(invalid3.error).toContain('United States');
      expect(invalid3.error).toContain('5 digits');

      const invalidPartialZip4 = validatePostalCode('90210-12', 'US', 'United States');
      expect(invalidPartialZip4.isValid).toBe(false);
    });

    test('validates UK alphanumeric postal codes', () => {
      expect(validatePostalCode('SW1A 1AA', 'GB', 'United Kingdom').isValid).toBe(true);
      expect(validatePostalCode('EC1A 1BB', 'GB', 'United Kingdom').isValid).toBe(true);
      expect(validatePostalCode('M1 1AE', 'GB', 'United Kingdom').isValid).toBe(true);
      expect(validatePostalCode('W1A 0AX', 'GB', 'United Kingdom').isValid).toBe(true);

      const invalidUk = validatePostalCode('12345', 'GB', 'United Kingdom');
      expect(invalidUk.isValid).toBe(false);
      expect(invalidUk.error).toContain('United Kingdom');
    });

    test('validates Canadian postal codes', () => {
      expect(validatePostalCode('K1A 0B1', 'CA', 'Canada').isValid).toBe(true);
      expect(validatePostalCode('M5V 3L9', 'CA', 'Canada').isValid).toBe(true);

      const invalidCa = validatePostalCode('12345', 'CA', 'Canada');
      expect(invalidCa.isValid).toBe(false);
      expect(invalidCa.error).toContain('Canada');
    });

    test('validates Australian 4-digit postcodes', () => {
      expect(validatePostalCode('2000', 'AU', 'Australia').isValid).toBe(true);
      expect(validatePostalCode('3000', 'AU', 'Australia').isValid).toBe(true);

      expect(validatePostalCode('20000', 'AU', 'Australia').isValid).toBe(false);
    });

    test('validates Germany and France 5-digit codes', () => {
      expect(validatePostalCode('10115', 'DE', 'Germany').isValid).toBe(true);
      expect(validatePostalCode('75001', 'FR', 'France').isValid).toBe(true);

      expect(validatePostalCode('101', 'DE', 'Germany').isValid).toBe(false);
    });

    test('accepts UAE postal / PO Box formats', () => {
      expect(validatePostalCode('00000', 'AE', 'United Arab Emirates').isValid).toBe(true);
      expect(validatePostalCode('12345', 'AE', 'United Arab Emirates').isValid).toBe(true);
    });

    test('handles other countries with generic international rules (3-10 chars)', () => {
      expect(validatePostalCode('01310-100', 'BR', 'Brazil').isValid).toBe(true);
      expect(validatePostalCode('ABC-123', 'XX', 'Other Country').isValid).toBe(true);
      expect(validatePostalCode('12', 'XX', 'Other Country').isValid).toBe(false);
    });

    test('rejects empty or whitespace postal codes', () => {
      expect(validatePostalCode('', 'IN', 'India').isValid).toBe(false);
      expect(validatePostalCode('   ', 'IN', 'India').isValid).toBe(false);
      expect(validatePostalCode(null, 'IN', 'India').isValid).toBe(false);
      expect(validatePostalCode(undefined, 'IN', 'India').isValid).toBe(false);
    });

    test('getPostalCodePlaceholder returns helpful placeholder per country', () => {
      expect(getPostalCodePlaceholder('IN')).toContain('PIN code');
      expect(getPostalCodePlaceholder('US')).toContain('ZIP');
      expect(getPostalCodePlaceholder('GB')).toContain('SW1A 1AA');
      expect(getPostalCodePlaceholder('CA')).toContain('K1A 0B1');
    });
  });
});
