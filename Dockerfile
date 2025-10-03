# Use Bun as base image
FROM oven/bun:1.2.5-alpine

# Set working directory
WORKDIR /app

# Install git for cloning
RUN apk add --no-cache git

# Clone the repository
RUN git clone https://github.com/muffn/hydra-server.git hydra-server

# Change into the repository directory
WORKDIR /app/hydra-server

# Install backend dependencies
RUN bun install

# Install frontend dependencies and build
WORKDIR /app/hydra-server/frontend
RUN bun install
RUN bun run build

# Return to root directory
WORKDIR /app/hydra-server

# Clean up unnecessary files to reduce image size
RUN rm -rf .git .github .gitignore README.md .prettierrc .prettierignore eslint.config.js tailwind.config.js fly.toml .dockerignore
RUN rm -rf frontend/node_modules frontend/src frontend/public frontend/package.json frontend/vite.config.ts frontend/tsconfig.json frontend/index.html
RUN rm -rf node_modules/.cache

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV IS_CUSTOM_SERVER=true

# Start the application
CMD ["bun", "run", "start"]
