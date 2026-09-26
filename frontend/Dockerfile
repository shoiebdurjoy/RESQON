FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application
COPY . .

# Build application
RUN npm run build

# Install serve to run production build
RUN npm install -g serve

# Expose port
EXPOSE 5173

# Run application
CMD ["serve", "-s", "dist", "-l", "5173"]
