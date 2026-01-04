# Use Node.js 22 base image
FROM node:22-alpine

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all project files
COPY . .

# Build the application
RUN pnpm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["pnpm", "run", "start"]
