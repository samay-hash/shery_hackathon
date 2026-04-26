FROM node:20-alpine

WORKDIR /app

# Install git and docker CLI so buildService can use them
RUN apk add --no-cache git docker-cli

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001 8000

CMD ["npm", "start"]
