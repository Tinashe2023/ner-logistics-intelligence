FROM php:8.3-cli

# PDO Postgres driver — needed to connect to Neon
RUN apt-get update \
    && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# Render injects $PORT — the app must listen on it, not a fixed port.
# Same php -S command you've been running locally, just bound to 0.0.0.0
# instead of localhost so it's reachable from outside the container.
CMD php -S 0.0.0.0:$PORT -t public
