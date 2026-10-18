import {
  Injectable,
  PipeTransform,
  BadRequestException,
  Body,
  Query,
  Param,
  Optional,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Parameter decorator that binds and validates a request body.
 *
 * Usage:
 *   @Post()
 *   create(@ZodBody(CreateLeadSchema) body: CreateLeadInput) { ... }
 */
export function ZodBody(schema: ZodSchema) {
  return Body(new ZodValidationPipe(schema));
}

/**
 * Parameter decorator for query parameter validation.
 *
 * Usage:
 *   @Get()
 *   findAll(@ZodQuery(PaginationSchema) query: PaginationInput) { ... }
 */
export function ZodQuery(schema: ZodSchema) {
  return Query(new ZodValidationPipe(schema));
}

/**
 * Parameter decorator for route parameter validation.
 *
 * Usage:
 *   @Get(':id')
 *   findOne(@ZodParam(UuidSchema) id: string) { ... }
 */
export function ZodParam(schema: ZodSchema) {
  return Param(new ZodValidationPipe(schema));
}

/**
 * NestJS pipe that validates request values against a Zod schema.
 *
 * Schema-bound instances are attached by the Zod parameter decorators; an
 * unconfigured global instance leaves values unchanged.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(@Optional() private readonly schema?: ZodSchema) {}

  transform(value: unknown): unknown {
    if (!this.schema) return value;

    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(this.formatError(result.error));
    }
    return result.data;
  }

  private formatError(error: ZodError): string {
    return (
      'Validation failed: ' +
      error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    );
  }
}
