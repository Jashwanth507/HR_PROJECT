FROM node:22-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY server.js ./
COPY frontend/ ./frontend/

# Create directories for persistent data and set correct ownership
RUN mkdir -p /app/data /app/uploads && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port
EXPOSE 3000

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/database.db

# Run the app
CMD ["npm", "start"]
