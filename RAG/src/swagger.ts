import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJSDoc.Options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "RCA Generator API",
			version: "1.0.0",
			description: "API for generating Root Cause Analysis reports",
		},
	},
	apis: ["./routes/*.ts"], // Adjust path if needed
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
	app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
