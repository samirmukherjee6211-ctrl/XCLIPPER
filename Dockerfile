# Use Node.js 20 LTS
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install only backend dependencies
RUN npm install --omit=dev @google-cloud/aiplatform cors express

# Copy server file
COPY server.js ./

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]
