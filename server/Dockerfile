FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy server code
COPY index.js db.js ml-optimizer.js ./

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV API_PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "index.js"]
