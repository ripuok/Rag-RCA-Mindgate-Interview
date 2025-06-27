"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = require("dotenv");
const rcaRoute_1 = __importDefault(require("./routes/rcaRoute"));
const swagger_1 = require("./swagger");
(0, dotenv_1.configDotenv)();
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
(0, swagger_1.setupSwagger)(app);
app.use("/rca", rcaRoute_1.default);
const PORT = process.env.PORT || 3111;
app.listen(PORT, () => console.log(`RCA Generator running on port ${PORT}`));
