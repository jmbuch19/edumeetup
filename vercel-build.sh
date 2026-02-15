#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "VERCEL_ENV: $VERCEL_ENV"

# Generate Prisma Client
npx prisma generate

# Run Build
next build
