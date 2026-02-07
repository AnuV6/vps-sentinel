# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only, initially)
# Note: We need devDependencies (typescript) to build, so we install all then prune.
RUN apk add --no-cache python3 make g++
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Prune dev dependencies to save space (optional, skipping for simplicity)
# RUN npm prune --production

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
