import { sanitizeInput, validateTextLength } from '../inputUtils';

describe('inputUtils', () => {
  describe('sanitizeInput', () => {
    describe('basic text sanitization', () => {
      it('should preserve normal text', () => {
        const result = sanitizeInput('Hello world');
        expect(result).toBe('Hello world');
      });

      it('should trim leading and trailing whitespace', () => {
        const result = sanitizeInput('  Hello world  ');
        expect(result).toBe('Hello world');
      });

      it('should normalize multiple spaces to single space', () => {
        const result = sanitizeInput('Hello    world   with   spaces');
        expect(result).toBe('Hello world with spaces');
      });

      it('should handle empty string', () => {
        const result = sanitizeInput('');
        expect(result).toBe('');
      });

      it('should handle string with only whitespace', () => {
        const result = sanitizeInput('   ');
        expect(result).toBe('');
      });
    });

    describe('HTML/SQL injection character removal', () => {
      it('should remove HTML angle brackets', () => {
        const result = sanitizeInput('Hello <script>alert("xss")</script> world');
        expect(result).toBe('Hello scriptalert(xss)/script world');
      });

      it('should remove quotes', () => {
        const result = sanitizeInput('Hello "world" and \'universe\'');
        expect(result).toBe('Hello world and universe');
      });

      it('should remove ampersand and semicolon', () => {
        const result = sanitizeInput('Hello & world; test');
        expect(result).toBe('Hello world test');
      });

      it('should remove backticks', () => {
        const result = sanitizeInput('Hello `world` test');
        expect(result).toBe('Hello world test');
      });

      it('should remove pipe and backslash', () => {
        const result = sanitizeInput('Hello | world \\ test');
        expect(result).toBe('Hello world test');
      });

      it('should remove curly braces and square brackets', () => {
        const result = sanitizeInput('Hello {world} [test]');
        expect(result).toBe('Hello world test');
      });

      it('should handle multiple dangerous characters at once', () => {
        const result = sanitizeInput('<script>alert("xss");</script>');
        expect(result).toBe('scriptalert(xss)/script');
      });
    });

    describe('line break and tab removal', () => {
      it('should remove carriage returns', () => {
        const result = sanitizeInput('Hello\rworld');
        expect(result).toBe('Helloworld');
      });

      it('should remove newlines', () => {
        const result = sanitizeInput('Hello\nworld');
        expect(result).toBe('Helloworld');
      });

      it('should remove tabs', () => {
        const result = sanitizeInput('Hello\tworld');
        expect(result).toBe('Helloworld');
      });

      it('should handle mixed line breaks', () => {
        const result = sanitizeInput('Hello\r\n\tworld');
        expect(result).toBe('Helloworld');
      });

      it('should preserve spaces while removing line breaks', () => {
        const result = sanitizeInput('Hello \n world \t test');
        expect(result).toBe('Hello world test');
      });
    });

    describe('zero-width character removal', () => {
      it('should remove zero-width space (U+200B)', () => {
        const result = sanitizeInput('Hello\u200Bworld');
        expect(result).toBe('Helloworld');
      });

      it('should remove zero-width non-joiner (U+200C)', () => {
        const result = sanitizeInput('Hello\u200Cworld');
        expect(result).toBe('Helloworld');
      });

      it('should remove zero-width joiner (U+200D)', () => {
        const result = sanitizeInput('Hello\u200Dworld');
        expect(result).toBe('Helloworld');
      });

      it('should remove byte order mark (U+FEFF)', () => {
        const result = sanitizeInput('Hello\uFEFFworld');
        expect(result).toBe('Helloworld');
      });

      it('should handle multiple zero-width characters', () => {
        const result = sanitizeInput('Hello\u200B\u200C\u200D\uFEFFworld');
        expect(result).toBe('Helloworld');
      });
    });

    describe('control character removal', () => {
      it('should remove null character (U+0000)', () => {
        const result = sanitizeInput('Hello\x00world');
        expect(result).toBe('Helloworld');
      });

      it('should remove bell character (U+0007)', () => {
        const result = sanitizeInput('Hello\x07world');
        expect(result).toBe('Helloworld');
      });

      it('should remove form feed (U+000C)', () => {
        const result = sanitizeInput('Hello\x0Cworld');
        expect(result).toBe('Helloworld');
      });

      it('should remove delete character (U+007F)', () => {
        const result = sanitizeInput('Hello\x7Fworld');
        expect(result).toBe('Helloworld');
      });

      it('should preserve line feed (U+000A) by removing it with other line breaks', () => {
        const result = sanitizeInput('Hello\x0Aworld');
        expect(result).toBe('Helloworld');
      });
    });

    describe('complex sanitization scenarios', () => {
      it('should handle text with multiple types of dangerous content', () => {
        const maliciousInput = '<script>alert("xss");</script>\r\n\t\u200BHello & "world"';
        const result = sanitizeInput(maliciousInput);
        expect(result).toBe('scriptalert(xss)/scriptHello world'); // Line breaks are removed, no space preserved
      });

      it('should handle Unicode normalization edge cases', () => {
        const result = sanitizeInput('Café\u200B résumé');
        expect(result).toBe('Café résumé');
      });

      it('should handle only special characters', () => {
        const result = sanitizeInput('<>"\'&;`\\|{}[]');
        expect(result).toBe('');
      });

      it('should handle mixed control and printable characters', () => {
        const result = sanitizeInput('Hello\x00\x01\x02world\x7F!');
        expect(result).toBe('Helloworld!');
      });

      it('should preserve accented characters and emojis', () => {
        const result = sanitizeInput('Héllo wörld 🌍 café');
        expect(result).toBe('Héllo wörld 🌍 café');
      });
    });
  });

  describe('validateTextLength', () => {
    describe('required field validation', () => {
      it('should return error for null input when required', () => {
        const result = validateTextLength(null, 1, 10, 'Title');
        expect(result).toBe('Title is required');
      });

      it('should return error for undefined input when required', () => {
        const result = validateTextLength(undefined, 1, 10, 'Title');
        expect(result).toBe('Title is required');
      });

      it('should return error for empty string when required', () => {
        const result = validateTextLength('', 1, 10, 'Title');
        expect(result).toBe('Title is required');
      });

      it('should return error for whitespace-only string when required', () => {
        const result = validateTextLength('   ', 1, 10, 'Title');
        expect(result).toBe('Title is required');
      });

      it('should return true for valid input when required', () => {
        const result = validateTextLength('Valid text', 1, 20, 'Title');
        expect(result).toBe(true);
      });
    });

    describe('optional field validation', () => {
      it('should return true for null input when optional', () => {
        const result = validateTextLength(null, 1, 10, 'Note', false);
        expect(result).toBe(true);
      });

      it('should return true for undefined input when optional', () => {
        const result = validateTextLength(undefined, 1, 10, 'Note', false);
        expect(result).toBe(true);
      });

      it('should return true for empty string when optional', () => {
        const result = validateTextLength('', 1, 10, 'Note', false);
        expect(result).toBe(true);
      });

      it('should return true for whitespace-only string when optional', () => {
        const result = validateTextLength('   ', 1, 10, 'Note', false);
        expect(result).toBe(true);
      });

      it('should still validate length for non-empty optional fields', () => {
        const result = validateTextLength('Too long text for limit', 1, 10, 'Note', false);
        expect(result).toBe('Note must be at most 10 characters');
      });
    });

    describe('minimum length validation', () => {
      it('should return error when text is too short', () => {
        const result = validateTextLength('Hi', 5, 20, 'Message');
        expect(result).toBe('Message must be at least 5 characters');
      });

      it('should return true when text meets minimum length', () => {
        const result = validateTextLength('Hello', 5, 20, 'Message');
        expect(result).toBe(true);
      });

      it('should handle minimum length of 0', () => {
        const result = validateTextLength('', 0, 10, 'Message', false);
        expect(result).toBe(true);
      });

      it('should trim whitespace before checking length', () => {
        const result = validateTextLength('  Hi  ', 5, 20, 'Message');
        expect(result).toBe('Message must be at least 5 characters');
      });
    });

    describe('maximum length validation', () => {
      it('should return error when text is too long', () => {
        const result = validateTextLength('This is a very long message that exceeds the limit', 1, 20, 'Message');
        expect(result).toBe('Message must be at most 20 characters');
      });

      it('should return true when text is within maximum length', () => {
        const result = validateTextLength('Short message', 1, 20, 'Message');
        expect(result).toBe(true);
      });

      it('should return true when text is exactly at maximum length', () => {
        const result = validateTextLength('Exactly twenty chars', 1, 20, 'Message');
        expect(result).toBe(true);
      });

      it('should trim whitespace before checking length', () => {
        const testText = '  This is exactly twenty  ';
        const trimmed = testText.trim(); // 'This is exactly twenty' = 21 characters
        const result = validateTextLength(testText, 1, 20, 'Message');
        expect(result).toBe('Message must be at most 20 characters'); // 21 > 20
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle zero-length limits correctly', () => {
        const result = validateTextLength('Any text', 0, 0, 'Field');
        expect(result).toBe('Field must be at most 0 characters');
      });

      it('should handle equal min and max length', () => {
        const result = validateTextLength('Hello', 5, 5, 'Field');
        expect(result).toBe(true);
      });

      it('should handle Unicode characters correctly', () => {
        const result = validateTextLength('Héllö 🌍', 5, 10, 'Field');
        expect(result).toBe(true);
      });

      it('should handle very large maximum length', () => {
        const result = validateTextLength('Short text', 1, 1000000, 'Field');
        expect(result).toBe(true);
      });

      it('should prioritize required validation over length validation', () => {
        const result = validateTextLength('', 5, 10, 'Field');
        expect(result).toBe('Field is required');
      });

      it('should prioritize minimum length over maximum length error', () => {
        const result = validateTextLength('Hi', 10, 5, 'Field'); // Invalid setup but test behavior
        expect(result).toBe('Field must be at least 10 characters');
      });
    });

    describe('field name customization', () => {
      it('should use provided field name in error messages', () => {
        const result = validateTextLength('', 1, 10, 'Task Title');
        expect(result).toBe('Task Title is required');
      });

      it('should handle field names with spaces', () => {
        const result = validateTextLength('Hi', 5, 20, 'Client Name');
        expect(result).toBe('Client Name must be at least 5 characters');
      });

      it('should handle field names with special characters', () => {
        const result = validateTextLength('Very long text that exceeds limit', 1, 10, 'Field (Optional)');
        expect(result).toBe('Field (Optional) must be at most 10 characters');
      });
    });

    describe('integration scenarios', () => {
      it('should work with typical form validation scenarios', () => {
        // Title field: required, 1-100 characters
        expect(validateTextLength('', 1, 100, 'Title')).toBe('Title is required');
        expect(validateTextLength('Valid Title', 1, 100, 'Title')).toBe(true);

        // Note field: optional, 0-500 characters
        expect(validateTextLength('', 0, 500, 'Note', false)).toBe(true);
        expect(validateTextLength('Optional note', 0, 500, 'Note', false)).toBe(true);

        // Location field: optional but if provided, min 2 characters
        expect(validateTextLength('', 2, 200, 'Location', false)).toBe(true);
        expect(validateTextLength('A', 2, 200, 'Location', false)).toBe('Location must be at least 2 characters');
        expect(validateTextLength('Valid Location', 2, 200, 'Location', false)).toBe(true);
      });

      it('should handle sanitized input correctly', () => {
        const sanitized = sanitizeInput('  Hello <script> world  ');
        const result = validateTextLength(sanitized, 5, 20, 'Input');
        expect(result).toBe(true);
      });
    });
  });
});