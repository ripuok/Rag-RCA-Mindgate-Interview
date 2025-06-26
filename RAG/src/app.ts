import express from "express";
import bodyParser from "body-parser";
import { configDotenv } from "dotenv";
import rcaRoute from "./routes/rcaRoute";
import { setupSwagger } from "./swagger";

configDotenv();

const app = express();
app.use(bodyParser.json());

setupSwagger(app);

app.use("/rca", rcaRoute);

const PORT = process.env.PORT || 3111;
app.listen(PORT, () => console.log(`RCA Generator running on port ${PORT}`));
