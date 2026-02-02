# 1. Use official Node image
FROM node:18

# 2. Create app folder
WORKDIR /app

# 3. Copy package.json files first (for faster builds)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the entire project
COPY . .

# 6. Build TypeScript
RUN npm run build

# 7. Default command (not used in compose)
CMD ["npm", "start"]