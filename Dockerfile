FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY data ./data

RUN npm run build

COPY src/api/docs/openapi.yaml dist/api/docs/openapi.yaml

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/api/index.js"]