#!/bin/sh
set -eu

echo "Aplicando migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/src/database/data-source.js

echo "Populando o banco..."
node dist/src/database/seed.js

echo "Subindo a API..."
node dist/src/server.js
