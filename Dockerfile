# ── Build stage ──────────────────────────────
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application source
COPY . .

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
