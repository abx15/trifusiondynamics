import { Module } from '@nestjs/common';
import { ZodValidationPipe } from './zod-validation.pipe';

@Module({
  providers: [ZodValidationPipe],
  exports: [ZodValidationPipe],
})
export class ValidationModule {}