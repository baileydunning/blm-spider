import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import campsiteRoutes from './routes/campsites';
import healthRoutes from './routes/health';
import notFound from './middleware/notFound';
import errorHandler from './middleware/errorHandler';
import tooManyRequests from './middleware/tooManyRequests';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

const swaggerDocument = YAML.load(path.join(__dirname, './docs/openapi.yaml'));

app.use(compression({ level: 9, threshold: 0 }));
app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api/v1/campsites', campsiteRoutes);
app.use('/health', healthRoutes);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(notFound);
app.use(errorHandler);
app.use(tooManyRequests);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
