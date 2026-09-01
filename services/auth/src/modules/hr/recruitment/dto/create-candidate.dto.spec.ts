import { validate } from 'class-validator';
import { CreateCandidateDto } from './create-candidate.dto';

describe('CreateCandidateDto (URL Validation Security)', () => {
  it('should reject invalid URL schemes (javascript:)', async () => {
    const dto = new CreateCandidateDto();
    dto.position = 'Developer';
    dto.candidateName = 'John Doe';
    dto.candidateEmail = 'john@example.com';
    dto.resumeUrl = 'javascript:alert(1)';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isUrl');
  });

  it('should reject invalid URL schemes (data:)', async () => {
    const dto = new CreateCandidateDto();
    dto.position = 'Developer';
    dto.candidateName = 'John Doe';
    dto.candidateEmail = 'john@example.com';
    dto.resumeUrl = 'data:text/html,<script>alert(1)</script>';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isUrl');
  });

  it('should reject URLs without protocol', async () => {
    const dto = new CreateCandidateDto();
    dto.position = 'Developer';
    dto.candidateName = 'John Doe';
    dto.candidateEmail = 'john@example.com';
    dto.resumeUrl = 'example.com/resume.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isUrl');
  });

  it('should accept valid HTTPS URLs', async () => {
    const dto = new CreateCandidateDto();
    dto.position = 'Developer';
    dto.candidateName = 'John Doe';
    dto.candidateEmail = 'john@example.com';
    dto.resumeUrl = 'https://example.com/resume.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid HTTP URLs', async () => {
    const dto = new CreateCandidateDto();
    dto.position = 'Developer';
    dto.candidateName = 'John Doe';
    dto.candidateEmail = 'john@example.com';
    dto.resumeUrl = 'http://example.com/resume.pdf';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject URLs exceeding maximum length (2048 chars)', async () => {
    const dto = new CreateCandidateDto();
    dto.position = 'Developer';
    dto.candidateName = 'John Doe';
    dto.candidateEmail = 'john@example.com';
    dto.resumeUrl = 'https://example.com/' + 'a'.repeat(2100);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should allow null resumeUrl (optional field)', async () => {
    const dto = new CreateCandidateDto();
    dto.position = 'Developer';
    dto.candidateName = 'John Doe';
    dto.candidateEmail = 'john@example.com';
    dto.resumeUrl = undefined;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
