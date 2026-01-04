# Use Node.js 22 base image
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

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
