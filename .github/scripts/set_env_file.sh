#!/bin/bash
# .github/scripts/set_env_file.sh
# Usage: ./set_env_file.sh <env>

set -e
ENV=$1
if [ -z "$ENV" ]; then
  echo "No environment specified. Usage: $0 <env>"
  exit 1
fi

if [ -f ".env.$ENV" ]; then
  cp ".env.$ENV" .env
  echo ".env.$ENV copied to .env"
else
  echo ".env.$ENV not found, skipping copy."
fi
