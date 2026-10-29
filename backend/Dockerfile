# Start from the official slim Python 3.12 image
FROM python:3.12-slim

# Copy the uv binary from its official image (same version as used locally)
COPY --from=ghcr.io/astral-sh/uv:0.11.3 /uv /bin/uv

# Work in /app/backend, matching the repo layout (/app/schema, /app/data)
WORKDIR /app/backend

# PYTHONUNBUFFERED: print logs right away
# UV_PROJECT_ENVIRONMENT: install packages into the image's system Python
#   instead of a .venv, so `python` can be run directly
ENV PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/usr/local

# Copy only the dependency files and install first, so this layer
# is cached and only reruns when dependencies change.
# --frozen: install the exact versions in uv.lock
# --no-dev: skip development tools (Ruff)
# --no-install-project: only install dependencies; the source code is not packaged
# --inexact: keep packages that come with the image (e.g. pip)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project --inexact --no-cache

# Copy the rest of the backend code
COPY . .

# The app listens on port 8000
EXPOSE 8000

# TODO (optional): run the app with a WSGI server (Gunicorn) instead of
# Flask's built-in development server, which is not meant for production
# References:
#   - https://www.fullstackpython.com/wsgi-servers.html
#   - https://flask.palletsprojects.com/en/stable/deploying/gunicorn/

# Default command: start the Flask server
CMD ["python", "run.py"]
