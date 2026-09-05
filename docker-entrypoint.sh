#!/bin/sh
set -e

echo "Applying database migrations"
node migrate.mjs

exec "$@"
