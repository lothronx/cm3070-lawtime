import {
  FILE_VALIDATION,
  generateUploadBatchId,
  generateUniqueFileName,
  processPickerFile,
  validateFile,
  processAndValidatePickerFile,
  ValidationResult
} from '../fileUploadUtils';

describe('fileUploadUtils', () => {
  describe('FILE_VALIDATION constants', () => {
    it('should have correct file size limits', () => {
      expect(FILE_VALIDATION.MAX_SIZE_MB).toBe(50);
      expect(FILE_VALIDATION.MAX_SIZE_BYTES).toBe(50 * 1024 * 1024);
    });

    it('should include common image types', () => {
      expect(FILE_VALIDATION.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(FILE_VALIDATION.ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(FILE_VALIDATION.ALLOWED_IMAGE_TYPES).toContain('image/gif');
      expect(FILE_VALIDATION.ALLOWED_IMAGE_TYPES).toContain('image/webp');
    });

    it('should include common document types', () => {
      expect(FILE_VALIDATION.ALLOWED_DOCUMENT_TYPES).toContain('application/pdf');
      expect(FILE_VALIDATION.ALLOWED_DOCUMENT_TYPES).toContain('application/msword');
      expect(FILE_VALIDATION.ALLOWED_DOCUMENT_TYPES).toContain('text/plain');
    });

    it('should include common audio types', () => {
      expect(FILE_VALIDATION.ALLOWED_AUDIO_TYPES).toContain('audio/mpeg');
      expect(FILE_VALIDATION.ALLOWED_AUDIO_TYPES).toContain('audio/wav');
      expect(FILE_VALIDATION.ALLOWED_AUDIO_TYPES).toContain('audio/m4a');
    });

    it('should include common video types', () => {
      expect(FILE_VALIDATION.ALLOWED_VIDEO_TYPES).toContain('video/mp4');
      expect(FILE_VALIDATION.ALLOWED_VIDEO_TYPES).toContain('video/avi');
      expect(FILE_VALIDATION.ALLOWED_VIDEO_TYPES).toContain('video/mov');
    });
  });

  describe('generateUploadBatchId', () => {
    it('should generate IDs with correct format', () => {
      const id = generateUploadBatchId();
      expect(id).toMatch(/^upload_\d+_[a-z0-9]{6}$/);
    });

    it('should generate unique IDs on consecutive calls', () => {
      const id1 = generateUploadBatchId();
      const id2 = generateUploadBatchId();
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp in ID', () => {
      const beforeTime = Date.now();
      const id = generateUploadBatchId();
      const afterTime = Date.now();

      const timestampStr = id.match(/^upload_(\d+)_/)?.[1];
      expect(timestampStr).toBeDefined();

      const timestamp = parseInt(timestampStr!);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('generateUniqueFileName', () => {
    it('should preserve file extension', () => {
      const fileName = generateUniqueFileName('document.pdf');
      expect(fileName).toMatch(/^file_\d+_[a-z0-9]{6}\.pdf$/);
    });

    it('should handle files without extension', () => {
      const fileName = generateUniqueFileName('README');
      expect(fileName).toMatch(/^file_\d+_[a-z0-9]{6}$/);
      expect(fileName).not.toContain('.');
    });

    it('should handle multiple dots in filename', () => {
      const fileName = generateUniqueFileName('my.backup.file.tar.gz');
      expect(fileName).toMatch(/^file_\d+_[a-z0-9]{6}\.gz$/);
    });

    it('should generate unique filenames', () => {
      const fileName1 = generateUniqueFileName('test.jpg');
      const fileName2 = generateUniqueFileName('test.jpg');
      expect(fileName1).not.toBe(fileName2);
    });

    it('should handle edge case with empty string', () => {
      const fileName = generateUniqueFileName('');
      expect(fileName).toMatch(/^file_\d+_[a-z0-9]{6}$/);
    });

    it('should handle filename that starts with dot', () => {
      const fileName = generateUniqueFileName('.gitignore');
      expect(fileName).toMatch(/^file_\d+_[a-z0-9]{6}\.gitignore$/); // Dot files treated as extension
    });
  });

  describe('processPickerFile', () => {
    it('should process complete asset data', () => {
      const asset = {
        uri: 'file:///path/to/image.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024000
      };

      const result = processPickerFile(asset);

      expect(result.uri).toBe('file:///path/to/image.jpg');
      expect(result.originalName).toBe('photo.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(1024000);
      expect(result.fileName).toMatch(/^file_\d+_[a-z0-9]{6}\.jpg$/);
    });

    it('should handle missing fileName with default', () => {
      const asset = {
        uri: 'file:///path/to/image.jpg',
        fileName: null,
        mimeType: 'image/jpeg',
        fileSize: 1024000
      };

      const result = processPickerFile(asset);

      expect(result.originalName).toMatch(/^image_\d+\.jpg$/);
      expect(result.fileName).toMatch(/^file_\d+_[a-z0-9]{6}\.jpg$/);
    });

    it('should handle missing mimeType with default', () => {
      const asset = {
        uri: 'file:///path/to/image.jpg',
        fileName: 'photo.jpg',
        mimeType: null,
        fileSize: 1024000
      };

      const result = processPickerFile(asset);

      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should handle missing fileSize with default', () => {
      const asset = {
        uri: 'file:///path/to/image.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: null
      };

      const result = processPickerFile(asset);

      expect(result.size).toBe(0);
    });

    it('should handle completely minimal asset', () => {
      const asset = {
        uri: 'file:///path/to/image.jpg'
      };

      const result = processPickerFile(asset);

      expect(result.uri).toBe('file:///path/to/image.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(0);
      expect(result.originalName).toMatch(/^image_\d+\.jpg$/);
      expect(result.fileName).toMatch(/^file_\d+_[a-z0-9]{6}\.jpg$/);
    });
  });

  describe('validateFile', () => {
    describe('valid files', () => {
      it('should validate image files', () => {
        const result = validateFile('image/jpeg', 1024000, 'photo.jpg');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate document files', () => {
        const result = validateFile('application/pdf', 5000000, 'document.pdf');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate audio files', () => {
        const result = validateFile('audio/mpeg', 10000000, 'audio.mp3');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate video files', () => {
        const result = validateFile('video/mp4', 20000000, 'video.mp4');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate files at exactly the size limit', () => {
        const result = validateFile('image/jpeg', FILE_VALIDATION.MAX_SIZE_BYTES, 'large.jpg');
        expect(result.isValid).toBe(true);
      });
    });

    describe('invalid file types', () => {
      it('should reject unsupported file types', () => {
        const result = validateFile('application/x-executable', 1024, 'virus.exe');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type \'exe\' is not supported');
      });

      it('should reject files with null mimeType and unknown extension', () => {
        const result = validateFile(null, 1024, 'unknown.xyz');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type \'xyz\' is not supported');
      });

      it('should handle files with no extension', () => {
        const result = validateFile('application/octet-stream', 1024, 'README');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type \'readme\' is not supported'); // Lowercased filename becomes extension
      });

      it('should handle undefined mimeType', () => {
        const result = validateFile(undefined, 1024, 'test.unknown');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type \'unknown\' is not supported');
      });
    });

    describe('file size validation', () => {
      it('should reject files exceeding size limit', () => {
        const oversizeFile = FILE_VALIDATION.MAX_SIZE_BYTES + 1;
        const result = validateFile('image/jpeg', oversizeFile, 'huge.jpg');

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('exceeds the 50MB limit');
        expect(result.error).toContain('50.0MB'); // Size should be formatted
      });

      it('should handle very large files with proper formatting', () => {
        const veryLargeFile = 100 * 1024 * 1024; // 100MB
        const result = validateFile('image/jpeg', veryLargeFile, 'huge.jpg');

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('(100.0MB)');
      });

      it('should handle null file size as 0 (valid)', () => {
        const result = validateFile('image/jpeg', null, 'empty.jpg');
        expect(result.isValid).toBe(true);
      });

      it('should handle undefined file size as 0 (valid)', () => {
        const result = validateFile('image/jpeg', undefined, 'empty.jpg');
        expect(result.isValid).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle missing fileName parameter', () => {
        const result = validateFile('application/unknown', 1024);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type \'unknown\' is not supported');
      });

      it('should handle empty fileName', () => {
        const result = validateFile('application/unknown', 1024, '');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type \'unknown\' is not supported');
      });

      it('should handle fileName with multiple dots correctly', () => {
        const result = validateFile('application/unknown', 1024, 'my.file.backup.xyz');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type \'xyz\' is not supported');
      });
    });
  });

  describe('processAndValidatePickerFile', () => {
    it('should process and validate a valid file', () => {
      const asset = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024000
      };

      const result = processAndValidatePickerFile(asset);

      expect(result.file.uri).toBe('file:///path/to/photo.jpg');
      expect(result.file.originalName).toBe('photo.jpg');
      expect(result.file.mimeType).toBe('image/jpeg');
      expect(result.file.size).toBe(1024000);
      expect(result.file.fileName).toMatch(/^file_\d+_[a-z0-9]{6}\.jpg$/);

      expect(result.validation.isValid).toBe(true);
      expect(result.validation.error).toBeUndefined();
    });

    it('should process and validate an invalid file type', () => {
      const asset = {
        uri: 'file:///path/to/virus.exe',
        fileName: 'virus.exe',
        mimeType: 'application/x-executable',
        fileSize: 1024
      };

      const result = processAndValidatePickerFile(asset);

      expect(result.file.originalName).toBe('virus.exe');
      expect(result.file.mimeType).toBe('application/x-executable');

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.error).toContain('File type \'exe\' is not supported');
    });

    it('should process and validate an oversized file', () => {
      const asset = {
        uri: 'file:///path/to/huge.jpg',
        fileName: 'huge.jpg',
        mimeType: 'image/jpeg',
        fileSize: FILE_VALIDATION.MAX_SIZE_BYTES + 1
      };

      const result = processAndValidatePickerFile(asset);

      expect(result.file.originalName).toBe('huge.jpg');
      expect(result.file.size).toBe(FILE_VALIDATION.MAX_SIZE_BYTES + 1);

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.error).toContain('exceeds the 50MB limit');
    });

    it('should handle assets with missing properties', () => {
      const asset = {
        uri: 'file:///path/to/image.jpg',
        fileName: null,
        mimeType: null,
        fileSize: null
      };

      const result = processAndValidatePickerFile(asset);

      expect(result.file.mimeType).toBe('image/jpeg'); // Default
      expect(result.file.size).toBe(0); // Default
      expect(result.file.originalName).toMatch(/^image_\d+\.jpg$/); // Generated

      expect(result.validation.isValid).toBe(true); // Valid MIME type and size
    });

    it('should demonstrate the complete workflow', () => {
      const validAsset = {
        uri: 'file:///documents/contract.pdf',
        fileName: 'contract.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048000 // 2MB
      };

      const { file, validation } = processAndValidatePickerFile(validAsset);

      // File should be processed with unique name
      expect(file.uri).toBe('file:///documents/contract.pdf');
      expect(file.originalName).toBe('contract.pdf');
      expect(file.fileName).not.toBe('contract.pdf'); // Should be unique
      expect(file.fileName).toMatch(/^file_\d+_[a-z0-9]{6}\.pdf$/);

      // Validation should pass
      expect(validation.isValid).toBe(true);

      // Can use the result for further processing
      if (validation.isValid) {
        expect(file.mimeType).toBe('application/pdf');
        expect(file.size).toBe(2048000);
      }
    });
  });
});