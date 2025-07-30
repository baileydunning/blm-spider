"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
// src/server.ts
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const PORT = process.env.PORT || 8080;
const app = (0, express_1.default)();
const swaggerDocument = yamljs_1.default.load(path_1.default.join(__dirname, '../openapi.yaml'));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
}));
// Cached JSON
let cachedCampsites = [];
const dataPath = path_1.default.join(__dirname, '../data/blm-campsites.json');
function loadCampsites() {
    if (cachedCampsites.length)
        return cachedCampsites;
    cachedCampsites = JSON.parse(fs_1.default.readFileSync(dataPath, 'utf-8'));
    return cachedCampsites;
}
app.get('/api/v1/campsites', (req, res, next) => {
    try {
        let campsites = loadCampsites();
        const state = req.query.state?.toLowerCase();
        if (state) {
            campsites = campsites.filter(site => site.state?.toLowerCase() === state);
        }
        const limit = parseInt(req.query.limit, 10);
        const offset = parseInt(req.query.offset, 10);
        if (req.query.limit && (isNaN(limit) || limit < 1)) {
            return res.status(400).json({ error: 'Invalid "limit" parameter' });
        }
        if (req.query.offset && (isNaN(offset) || offset < 0)) {
            return res.status(400).json({ error: 'Invalid "offset" parameter' });
        }
        if (!isNaN(limit) && !isNaN(offset)) {
            campsites = campsites.slice(offset, offset + limit);
        }
        res.json(campsites);
    }
    catch (err) {
        next(err);
    }
});
app.get('/api/v1/campsites/:id', (req, res, next) => {
    try {
        const site = loadCampsites().find(site => site.id === req.params.id);
        if (!site)
            return res.status(404).json({ error: 'Campsite not found' });
        res.json(site);
    }
    catch (err) {
        next(err);
    }
});
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
function startServer() {
    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} listening on port ${PORT}`);
    });
}
