# Recipe for building the application image.
#
# Each instruction creates a layer, and Docker caches them. That is why the
# dependency install comes before copying the source: changing a source file
# does not invalidate the cached install, so rebuilds are fast.

# The starting point: an official image with Node already set up.
# "alpine" is a minimal Linux distribution — around 50MB instead of 400MB.
# The version is pinned on purpose: "node:latest" would mean a different Node
# in six months and a build that breaks for no visible reason.
FROM node:24-alpine

# Every command after this runs from /app inside the container. The directory
# is created if it does not exist.
WORKDIR /app

# Copy only the dependency manifests first.
#
# This is the caching trick: as long as these two files do not change, Docker
# reuses the cached npm install below instead of re-running it. Editing a
# controller then rebuilds in seconds rather than minutes.
COPY package*.json ./

# npm ci rather than npm install: it installs the exact versions from
# package-lock.json, so the build is reproducible. --omit=dev leaves out
# nodemon, vitest and supertest, which have no business in production.
RUN npm ci --omit=dev

# Now the source. This layer changes on every code edit, which is fine because
# it is the cheap one.
COPY . .

# Documentation only — it does not actually open the port. Publishing happens
# in docker-compose.yml.
EXPOSE 3000

# What runs when the container starts. Note it is server.js, not nodemon:
# nothing is watching for file changes in production.
CMD ["node", "src/server.js"]