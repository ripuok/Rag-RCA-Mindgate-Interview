// Ollama RAG System - JavaScript Implementation
// This template provides functions for embedding, storing, retrieving, and generating responses

class OllamaRAGSystem {
	constructor(ollamaBaseUrl = "http://localhost:11434") {
		this.baseUrl = ollamaBaseUrl;
		this.vectorStore = new Map(); // Simple in-memory vector store
		this.documents = [];
		this.embeddings = [];
	}

	// Function to generate embeddings using Ollama API
	async generateEmbedding(text, model = "mxbai-embed-large") {
		try {
			const response = await fetch(`${this.baseUrl}/api/embed`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: model,
					input: text,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Embedding API error:", errorText);
				throw new Error(
					`HTTP error! status: ${response.status}, message: ${errorText}`
				);
			}

			const data = await response.json();
			console.log("Embedding response structure:", Object.keys(data));
			console.log(data);

			// Handle different response formats
			if (data.embeddings) {
				return data.embeddings;
			} else if (data.embedding) {
				return data.embedding;
			} else if (Array.isArray(data)) {
				return data;
			} else {
				console.error("Unexpected embedding response format:", data);
				throw new Error("Unexpected embedding response format");
			}
		} catch (error) {
			console.error("Error generating embedding:", error);
			throw error;
		}
	}

	// Function to store documents with their embeddings
	async storeDocuments(documents, model = "mxbai-embed-large") {
		console.log("Storing documents and generating embeddings...");

		for (let i = 0; i < documents.length; i++) {
			const doc = documents[i];
			console.log(`Processing document ${i + 1}/${documents.length}`);

			try {
				const embedding = await this.generateEmbedding(doc, model);
				console.log(`Embedding generated for document ${i + 1}`);
				this.documents.push(doc);
				this.embeddings.push(embedding);
				this.vectorStore.set(i, {
					id: i,
					document: doc,
					embedding: embedding,
				});

				console.log(`Document ${i + 1} stored successfully`);
			} catch (error) {
				console.error(`Error storing document ${i + 1}:`, error);
			}
		}
		console.log(this.vectorStore);
		console.log(`Stored ${this.documents.length} documents`);
	}

	// Function to calculate cosine similarity between two vectors
	cosineSimilarity(vecA, vecB) {
		if (!vecA || !vecB) {
			console.warn("Null vectors detected");
			return 0;
		}

		// Handle nested arrays (if embeddings come wrapped)
		const flatVecA = Array.isArray(vecA[0]) ? vecA[0] : vecA;
		const flatVecB = Array.isArray(vecB[0]) ? vecB[0] : vecB;

		if (flatVecA.length !== flatVecB.length) {
			console.warn(
				`Vector length mismatch: ${flatVecA.length} vs ${flatVecB.length}`
			);
			return 0;
		}

		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < flatVecA.length; i++) {
			const a = parseFloat(flatVecA[i]) || 0;
			const b = parseFloat(flatVecB[i]) || 0;

			dotProduct += a * b;
			normA += a * a;
			normB += b * b;
		}

		const denominator = Math.sqrt(normA) * Math.sqrt(normB);

		if (denominator === 0) {
			console.warn("Zero norm vectors detected");
			return 0;
		}

		const similarity = dotProduct / denominator;

		if (isNaN(similarity)) {
			console.warn("NaN similarity calculated, returning 0");
			console.log(
				"Debug - dotProduct:",
				dotProduct,
				"normA:",
				normA,
				"normB:",
				normB
			);
			return 0;
		}

		return similarity;
	}

	// Function to retrieve most relevant documents
	async retrieveRelevantDocuments(
		query,
		topK = 10,
		model = "mxbai-embed-large"
	) {
		console.log("Retrieving relevant documents...");

		try {
			const queryEmbedding = await this.generateEmbedding(query, model);
			const similarities = [];

			// Calculate similarity with all stored documents
			for (const [id, docData] of this.vectorStore) {
				const similarity = this.cosineSimilarity(
					queryEmbedding,
					docData.embedding
				);
				similarities.push({
					id: id,
					document: docData.document,
					similarity: similarity,
				});
			}

			// Sort by similarity (descending) and return top K
			similarities.sort((a, b) => b.similarity - a.similarity);
			console.log(" Retreived similarities: ", similarities);
			return similarities.slice(0, topK);
		} catch (error) {
			console.error("Error retrieving documents:", error);
			throw error;
		}
	}

	// Function to generate response using Ollama
	async generateResponse(prompt, model = "llama3.2:1b") {
		try {
			console.log(`Generating response with model: ${model}`);
			console.log(`Prompt length: ${prompt.length} characters`);

			const requestBody = {
				model: model,
				prompt: prompt,
				stream: false,
			};

			console.log("Request body:", JSON.stringify(requestBody, null, 2));

			const response = await fetch(`${this.baseUrl}/api/generate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			console.log("Response status:", response.status);
			console.log(
				"Response headers:",
				Object.fromEntries(response.headers.entries())
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Generation API error:", errorText);
				throw new Error(
					`HTTP error! status: ${response.status}, message: ${errorText}`
				);
			}

			const data = await response.json();
			console.log("Generation response keys:", Object.keys(data));

			return data.response || data.message || JSON.stringify(data);
		} catch (error) {
			console.error("Error generating response:", error);
			throw error;
		}
	}

	// Main RAG function: retrieve relevant context and generate answer
	async askQuestion(
		question,
		model = "llama3.2:1b",
		embedModel = "mxbai-embed-large"
	) {
		console.log(`Question: ${question}`);

		try {
			// Auto-select model if not provided
			if (!model) {
				const availableModels = await this.getAvailableGenerationModels();
				if (availableModels.length === 0) {
					throw new Error(
						"No generation models available. Please pull a model like: ollama pull llama3.2"
					);
				}
				model = availableModels[0].name;
				console.log(`Using model: ${model}`);
			}

			// Check if the specified model exists
			const modelExists = await this.checkModel(model);
			if (!modelExists) {
				const availableModels = await this.getAvailableGenerationModels();
				if (availableModels.length === 0) {
					throw new Error(
						`Model '${model}' not found and no alternative models available. Please pull a model first.`
					);
				}
				model = availableModels[0].name;
				console.log(`Model not found, using alternative: ${model}`);
			}

			// Step 1: Retrieve relevant documents
			const relevantDocs = await this.retrieveRelevantDocuments(
				question,
				3,
				embedModel
			);

			if (relevantDocs.length === 0) {
				console.log("No relevant documents found");
				return "I could not find relevant information to answer your question.";
			}

			const context = relevantDocs[0].document;
			console.log(`Retrieved context: ${context.substring(0, 100)}...`);
			console.log(`Similarity score: ${relevantDocs[0].similarity.toFixed(4)}`);

			// Step 2: Generate response using context
			const prompt = `Using this data: ${context}. Respond to this prompt: ${question}`;
			const response = await this.generateResponse(prompt, model);

			return response;
		} catch (error) {
			console.error("Error in askQuestion:", error);
			throw error;
		}
	}

	// Utility function to check if Ollama is running
	async checkOllamaStatus() {
		try {
			const response = await fetch(`${this.baseUrl}/api/tags`);
			return response.ok;
		} catch (error) {
			return false;
		}
	}

	// Function to check if a specific model exists
	async checkModel(modelName) {
		try {
			const models = await this.listModels();
			return models.some((model) => model.name === modelName);
		} catch (error) {
			console.error("Error checking model:", error);
			return false;
		}
	}

	// Function to check if a specific model exists
	async checkModel(modelName) {
		try {
			const models = await this.listModels();
			return models.some((model) => model.name === modelName);
		} catch (error) {
			console.error("Error checking model:", error);
			return false;
		}
	}

	// Function to get available models for generation
	async getAvailableGenerationModels() {
		try {
			const models = await this.listModels();
			const generationModels = models.filter(
				(model) =>
					!model.name.includes("embed") &&
					(model.name.includes("llama") ||
						model.name.includes("mistral") ||
						model.name.includes("codellama") ||
						model.name.includes("phi") ||
						model.name.includes("gemma") ||
						model.name.includes("qwen"))
			);
			return generationModels;
		} catch (error) {
			console.error("Error getting generation models:", error);
			return [];
		}
	}

	// Function to list available models
	async listModels() {
		try {
			const response = await fetch(`${this.baseUrl}/api/tags`);
			const data = await response.json();
			return data.models;
		} catch (error) {
			console.error("Error listing models:", error);
			return [];
		}
	}
}

// Example usage and test functions
async function runExample() {
	// Sample documents about llamas
	const documents = [
		"Llamas are members of the camelid family meaning they're pretty closely related to vicuñas and camels",
		"Llamas were first domesticated and used as pack animals 4,000 to 5,000 years ago in the Peruvian highlands",
		"Llamas can grow as much as 6 feet tall though the average llama between 5 feet 6 inches and 5 feet 9 inches tall",
		"Llamas weigh between 280 and 450 pounds and can carry 25 to 30 percent of their body weight",
		"Llamas are vegetarians and have very efficient digestive systems",
		"Llamas live to be about 20 years old, though some only live for 15 years and others live to be 30 years old",
	];

	// Initialize RAG system
	const ragSystem = new OllamaRAGSystem();

	// Check if Ollama is running
	console.log("Checking Ollama status...");
	const isOllamaRunning = await ragSystem.checkOllamaStatus();

	if (!isOllamaRunning) {
		console.error("Ollama is not running. Please start Ollama first.");
		return;
	}

	console.log("Ollama is running!");

	// List available models
	console.log("Available models:");
	const models = await ragSystem.listModels();
	models.forEach((model) => console.log(`- ${model.name} (${model.size})`));

	try {
		// Store documents
		await ragSystem.storeDocuments(documents);

		// Ask questions
		const questions = [
			"What animals are llamas related to?",
			"How tall do llamas grow?",
			"What do llamas eat?",
			"How long do llamas live?",
		];

		for (const question of questions) {
			console.log("\n" + "=".repeat(50));
			const answer = await ragSystem.askQuestion(question);
			console.log(`Answer: ${answer}`);
		}
	} catch (error) {
		console.error("Error in example:", error);
	}
}

// Helper functions for batch processing
async function batchGenerateEmbeddings(texts, model = "mxbai-embed-large") {
	const embeddings = [];

	for (const text of texts) {
		try {
			const response = await fetch("http://localhost:11434/api/embed", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ model, input: text }),
			});

			const data = await response.json();
			embeddings.push(data.embeddings);
		} catch (error) {
			console.error("Error generating embedding:", error);
			embeddings.push(null);
		}
	}

	return embeddings;
}

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
	module.exports = { OllamaRAGSystem, runExample, batchGenerateEmbeddings };
}

// Auto-run example if this file is executed directly
if (typeof window === "undefined") {
	// Node.js environment
	runExample().catch(console.error);
}
