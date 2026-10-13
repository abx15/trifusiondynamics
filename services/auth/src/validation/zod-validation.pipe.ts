import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Registry that maps (controller prototype, method name, parameter index) -> Zod schema.
 * Populated by the `@ZodBody` decorator; read by the ZodValidationPipe.
 */
const schemaRegistry = new WeakMap<object, Map<number, ZodSchema>>();

function getOrCreateMap(target: object): Map<number, ZodSchema> {
  let map = schemaRegistry.get(target);
  if (!map) {
    map = new Map();
    schemaRegistry.set(target, map);
  }
  return map;
}

/**
 * Parameter decorator that attaches a Zod schema to a controller method parameter.
 *
 * Usage:
 *   @Post()
 *   create(@ZodBody(CreateLeadSchema) body: CreateLeadInput) { ... }
 */
export function ZodBody(schema: ZodSchema) {
  return function (_target: object, _key: string | symbol, idx: number) {
    // `this` inside a parameter decorator is the prototype of the class.
    const map = getOrCreateMap(_target);
    map.set(idx, schema);
  };
}

/**
 * NestJS pipe that validates request payloads against a Zod schema registered
 * via `@ZodBody` (or any other decorator that populates the schema registry).
 *
 * Registered globally via `app.useGlobalPipes(new ZodValidationPipe())`.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // metadata.data is the parameter index for @Body/@Query/@Param.
    const paramIndex = metadata.data;
    if (paramIndex === undefined) return value;

    // The controller prototype is the metatype's prototype.
    const metatype = metadata.metatype;
    if (!metatype) return value;

    const map = schemaRegistry.get(metatype.prototype);
    const schema = map?.get(Number(paramIndex));
    if (!schema) return value;

    const result = schema.safeParse(value);
    if (!result.success) {
      throw new UnauthorizedException(this.formatError(result.error));
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
