"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStateFromCoordinates = getStateFromCoordinates;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const helpers_1 = require("@turf/helpers");
const boolean_point_in_polygon_1 = __importDefault(require("@turf/boolean-point-in-polygon"));
const statesGeoJSON = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../data/us-states.geojson'), 'utf8'));
function getStateFromCoordinates(lat, lng) {
    const pt = (0, helpers_1.point)([lng, lat]);
    for (const feature of statesGeoJSON.features) {
        if ((0, boolean_point_in_polygon_1.default)(pt, feature)) {
            return feature.properties?.name || null;
        }
    }
    return null;
}
