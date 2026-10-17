#!/bin/sh
set -eu

echo "Aplicando migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/src/infrastructure/database/data-source.js

echo "Populando o banco..."
node dist/src/infrastructure/database/seed.js

echo "Subindo a API..."
node dist/src/server.js
