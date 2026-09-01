#!/usr/bin/env bash
# migrate.sh — Safe migration helper for the AgencyOS Prisma database.
#
# Usage:
#   ./scripts/migrate.sh deploy          # Apply pending migrations (production-safe)
#   ./scripts/migrate.sh deploy --dry-run  # Show what would be applied without executing
#   ./scripts/migrate.sh status          # Show pending/ applied migrations
#   ./scripts/migrate.sh diff            # Show unapplied schema diff
#   ./scripts/migrate.sh reset           # Reset test DB (NEVER use in production)
#
# Environment:
#   DATABASE_URL   — pooled connection string (required for deploy/status/diff)
#   DIRECT_URL     — direct connection string (required for deploy/status/diff)
#   NODE_ENV       — must NOT be "production" when running reset
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/packages/database" || {
  echo "ERROR: packages/database directory not found" >&2
  exit 1
}

DRY_RUN=false
ACTION="${1:-}"

if [[ "${2:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# Guard: refuse to run against production unless explicitly aware
if [[ "$NODE_ENV" == "production" && "$ACTION" == "reset" ]]; then
  echo "ERROR: 'reset' is not allowed in production environment" >&2
  exit 1
fi

# Guard: require DATABASE_URL
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL environment variable is not set" >&2
  exit 1
fi

case "$ACTION" in
  deploy)
    if $DRY_RUN; then
      echo "--- DRY RUN: Would apply migrations from $(pwd)/prisma/migrations ---"
    else
      echo "Applying migrations..."
    fi
    npx prisma migrate deploy
    echo "Migrations applied successfully."
    ;;

  status)
    echo "Migration status:"
    npx prisma migrate status
    ;;

  diff)
    echo "Diff between schema and database:"
    npx prisma migrate diff \
      --from-migrations ./prisma/migrations \
      --to-schema-datamodel ./prisma/schema.prisma \
      --script
    ;;

  reset)
    if [[ "$NODE_ENV" == "production" ]]; then
      echo "ERROR: 'reset' is not allowed in production environment" >&2
      exit 1
    fi
    echo "Resetting database (non-production only)..."
    npx prisma migrate reset --force --skip-seed
    echo "Database reset complete."
    ;;

  *)
    echo "Usage: $0 {deploy [--dry-run]|status|diff|reset}" >&2
    exit 1
    ;;
esac
