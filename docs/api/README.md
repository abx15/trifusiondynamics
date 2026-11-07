# API Reference

The core API is implemented in `services/auth` (NestJS) and uses the global `/api` prefix.

## Runtime API documentation

When the API is running and documentation routes are enabled:

| Reference | Local URL |
|---|---|
| Swagger UI | http://localhost:8000/api/docs |
| Scalar | http://localhost:8000/api/docs/scalar |
| ReDoc | http://localhost:8000/api/docs/redoc |
| OpenAPI JSON | http://localhost:8000/api/docs-json |

The exact paths may depend on application configuration. The generated document from the running service is preferred over a checked-in snapshot.

## Repository references

- [Route inventory](../architecture/actual-routes.md)
- [OpenAPI snapshot](../swagger.json)
- [Authentication flow](../architecture/auth-flow.md)

These files are snapshots and may lag behind implementation. Verify route path, request DTO, response shape, guards, role/permission requirements and tenant scope in current source before integrating.

## API integration checklist

- Use HTTPS outside local development.
- Send authentication using the mechanism configured by the deployment.
- Respect rate limits and pagination.
- Handle 401, 403, 404, 409, 422 and 429 responses explicitly.
- Use request IDs from response headers when reporting failures.
- Never log authorization headers, cookies or sensitive payloads.
- Do not infer that an endpoint is public because an old route inventory labels it public.
