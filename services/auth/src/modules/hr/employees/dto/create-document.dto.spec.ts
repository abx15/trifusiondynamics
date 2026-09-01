import { validate } from 'class-validator';
import { CreateEmployeeDocumentDto } from './create-document.dto';

describe('CreateEmployeeDocumentDto (URL Validation Security)', () => {
  it('should reject invalid URL schemes (javascript:)', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'javascript:alert(1)';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isUrl');
  });

  it('should reject invalid URL schemes (data:)', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'data:text/html,<script>alert(1)</script>';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isUrl');
  });

  it('should reject URLs without protocol', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'example.com/document.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isUrl');
  });

  it('should accept valid HTTPS URLs', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'https://storage.example.com/documents/offer-letter.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid HTTP URLs', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'http://storage.example.com/documents/offer-letter.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject URLs with path traversal sequences (../../../etc/passwd)', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'https://storage.example.com/../../../etc/passwd';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject URLs with null byte injection', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'https://storage.example.com/document.pdf%00.exe';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject file:// protocol URLs', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'file:///etc/passwd';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject ftp:// protocol URLs', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'ftp://evil.example.com/steal.exe';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject URLs containing script tags', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'https://example.com/<script>alert(1)</script>';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject URLs exceeding maximum length (2048 chars)', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = 'https://storage.example.com/' + 'a'.repeat(2100);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should reject type exceeding maximum length (255 chars)', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'a'.repeat(256);
    dto.fileUrl = 'https://storage.example.com/document.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should require employeeId', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = '';
    dto.type = 'offer_letter';
    dto.fileUrl = 'https://storage.example.com/document.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should require type', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = '';
    dto.fileUrl = 'https://storage.example.com/document.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should require fileUrl', async () => {
    const dto = new CreateEmployeeDocumentDto();
    dto.employeeId = 'emp-123';
    dto.type = 'offer_letter';
    dto.fileUrl = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
