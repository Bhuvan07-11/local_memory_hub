FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
ENV PORT=3001 NODE_ENV=production
CMD ["node", "server/index.js"]
