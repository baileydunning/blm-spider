"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const fs_1 = require("fs");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const swaggerDocument = yamljs_1.default.load(__dirname + '/../openapi.yaml');
dotenv_1.default.config();
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
function loadCampsites() {
    try {
        const data = (0, fs_1.readFileSync)('data/blm-campsites.json', 'utf-8');
        return JSON.parse(data);
    }
    catch (err) {
        throw new Error('Failed to load campsite data.');
    }
}
app.get('/api/v1/campsites', (req, res, next) => {
    try {
        let campsites = loadCampsites();
        const state = req.query.state;
        if (state) {
            campsites = campsites.filter((site) => site.state?.toLowerCase() === state.toLowerCase());
        }
        const limitParam = req.query.limit;
        const offsetParam = req.query.offset;
        let limit;
        let offset;
        if (limitParam !== undefined) {
            limit = parseInt(limitParam, 10);
            if (isNaN(limit) || limit < 1) {
                return res.status(400).json({ error: 'Invalid "limit" parameter' });
            }
        }
        if (offsetParam !== undefined) {
            offset = parseInt(offsetParam, 10);
            if (isNaN(offset) || offset < 0) {
                return res.status(400).json({ error: 'Invalid "offset" parameter' });
            }
        }
        if (limit !== undefined && offset !== undefined) {
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
        const campsites = loadCampsites();
        const site = campsites.find((site) => site.id === req.params.id);
        if (!site) {
            return res.status(404).json({ error: 'Campsite not found' });
        }
        res.json(site);
    }
    catch (err) {
        next(err);
    }
});
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
