#!/usr/bin/env bash
# FoodGrid Boston — Django dev server startup script.
# Runs on 127.0.0.1:8000 so Vite's proxy can reach it.
set -e

cd "$(dirname "$0")"

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Verify MongoDB connectivity before starting
python manage.py check_connection

echo "Starting Django on http://127.0.0.1:8000 ..."
python manage.py runserver 127.0.0.1:8000
