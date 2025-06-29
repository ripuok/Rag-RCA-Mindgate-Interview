// Production Ollama RAG System with Advanced Chunking and Embedding
class ProductionOllamaRAGSystem {
	constructor(ollamaBaseUrl = "http://localhost:11434") {
		this.baseUrl = ollamaBaseUrl;
		this.vectorStore = new Map();
		this.documents = [];
		this.embeddings = [];

		// Production configuration
		this.config = {
			chunking: {
				maxChunkSize: 512, // tokens
				minChunkSize: 100, // tokens
				overlap: 50, // token overlap
				preserveStructure: true, // maintain document structure
			},
			embedding: {
				batchSize: 16, // process in batches
				retryAttempts: 3, // retry failed embeddings
				rateLimitDelay: 100, // ms between requests
				concurrency: 4, // concurrent embedding requests
			},
			retrieval: {
				defaultTopK: 5,
				similarityThreshold: 0.3,
				rerankResults: true,
			},
		};
	}

	// Advanced text chunking with semantic awareness
	async intelligentChunk(text, metadata = {}) {
		const chunks = [];

		// 1. Clean and normalize text
		const cleanText = this.cleanText(text);

		// 2. Apply different chunking strategies based on content type
		const contentType = this.detectContentType(cleanText, metadata);

		switch (contentType) {
			case "code":
				return this.chunkCode(cleanText, metadata);
			case "structured":
				return this.chunkStructuredText(cleanText, metadata);
			case "narrative":
				return this.chunkNarrative(cleanText, metadata);
			default:
				return this.chunkGeneral(cleanText, metadata);
		}
	}

	cleanText(text) {
		// Remove excessive whitespace while preserving structure
		return text
			.replace(/\r\n/g, "\n") // normalize line endings
			.replace(/\n{3,}/g, "\n\n") // max 2 consecutive newlines
			.replace(/[ \t]{2,}/g, " ") // collapse multiple spaces
			.trim();
	}

	detectContentType(text, metadata) {
		if (metadata.type) return metadata.type;

		// Simple heuristics for content type detection
		const codePatterns = [
			/function\s+\w+\s*\(/,
			/class\s+\w+/,
			/import\s+.*from/,
			/def\s+\w+\s*\(/,
			/<\w+[^>]*>/,
		];

		const structuredPatterns = [
			/^#{1,6}\s+/m, // markdown headers
			/^\d+\.\s+/m, // numbered lists
			/^[-*+]\s+/m, // bullet lists
		];

		if (codePatterns.some((pattern) => pattern.test(text))) {
			return "code";
		}

		if (structuredPatterns.some((pattern) => pattern.test(text))) {
			return "structured";
		}

		// Check for narrative indicators
		const sentences = text.split(/[.!?]+/).length;
		const avgWordsPerSentence = text.split(/\s+/).length / sentences;

		if (avgWordsPerSentence > 15) {
			return "narrative";
		}

		return "general";
	}

	chunkGeneral(text, metadata) {
		const chunks = [];
		const sentences = this.splitIntoSentences(text);

		let currentChunk = "";
		let currentTokenCount = 0;

		for (const sentence of sentences) {
			const sentenceTokens = this.estimateTokens(sentence);

			// Check if adding this sentence would exceed chunk size
			if (
				currentTokenCount + sentenceTokens >
					this.config.chunking.maxChunkSize &&
				currentTokenCount >= this.config.chunking.minChunkSize
			) {
				// Save current chunk
				chunks.push(this.createChunk(currentChunk, metadata, chunks.length));

				// Start new chunk with overlap
				const overlapText = this.getOverlapText(
					currentChunk,
					this.config.chunking.overlap
				);
				currentChunk = overlapText + sentence;
				currentTokenCount = this.estimateTokens(currentChunk);
			} else {
				currentChunk += (currentChunk ? " " : "") + sentence;
				currentTokenCount += sentenceTokens;
			}
		}

		// Add final chunk if it meets minimum size
		if (currentTokenCount >= this.config.chunking.minChunkSize) {
			chunks.push(this.createChunk(currentChunk, metadata, chunks.length));
		}

		return chunks;
	}

	chunkStructuredText(text, metadata) {
		const chunks = [];
		const sections = this.splitByStructure(text);

		for (const section of sections) {
			const sectionChunks = this.chunkGeneral(section.content, {
				...metadata,
				section: section.header,
				level: section.level,
			});
			chunks.push(...sectionChunks);
		}

		return chunks;
	}

	chunkCode(text, metadata) {
		const chunks = [];
		const functions = this.extractCodeBlocks(text);

		// Keep functions together when possible
		for (const func of functions) {
			const tokenCount = this.estimateTokens(func);

			if (tokenCount <= this.config.chunking.maxChunkSize) {
				chunks.push(
					this.createChunk(func, { ...metadata, type: "code" }, chunks.length)
				);
			} else {
				// Split large functions by logical blocks
				const subChunks = this.splitLargeCodeBlock(func);
				subChunks.forEach((chunk) => {
					chunks.push(
						this.createChunk(
							chunk,
							{ ...metadata, type: "code" },
							chunks.length
						)
					);
				});
			}
		}

		return chunks;
	}

	chunkNarrative(text, metadata) {
		// For narrative text, prioritize paragraph and sentence boundaries
		const paragraphs = text.split(/\n\s*\n/);
		const chunks = [];

		let currentChunk = "";
		let currentTokenCount = 0;

		for (const paragraph of paragraphs) {
			const paragraphTokens = this.estimateTokens(paragraph);

			if (
				currentTokenCount + paragraphTokens >
					this.config.chunking.maxChunkSize &&
				currentTokenCount >= this.config.chunking.minChunkSize
			) {
				chunks.push(this.createChunk(currentChunk, metadata, chunks.length));
				currentChunk = paragraph;
				currentTokenCount = paragraphTokens;
			} else {
				currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
				currentTokenCount += paragraphTokens;
			}
		}

		if (currentTokenCount >= this.config.chunking.minChunkSize) {
			chunks.push(this.createChunk(currentChunk, metadata, chunks.length));
		}

		return chunks;
	}

	// Helper methods for chunking
	splitIntoSentences(text) {
		// Enhanced sentence splitting that handles edge cases
		return text
			.split(/(?<=[.!?])\s+(?=[A-Z])/)
			.filter((sentence) => sentence.trim().length > 0);
	}

	splitByStructure(text) {
		const sections = [];
		const lines = text.split("\n");
		let currentSection = { header: "", content: "", level: 0 };

		for (const line of lines) {
			const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

			if (headerMatch) {
				// Save previous section
				if (currentSection.content.trim()) {
					sections.push(currentSection);
				}

				// Start new section
				currentSection = {
					header: headerMatch[2],
					content: "",
					level: headerMatch[1].length,
				};
			} else {
				currentSection.content += line + "\n";
			}
		}

		// Add final section
		if (currentSection.content.trim()) {
			sections.push(currentSection);
		}

		return sections;
	}

	extractCodeBlocks(text) {
		// Extract functions, classes, and other logical code blocks
		const blocks = [];
		const lines = text.split("\n");
		let currentBlock = "";
		let braceCount = 0;
		let inFunction = false;

		for (const line of lines) {
			currentBlock += line + "\n";

			// Simple brace counting for block detection
			braceCount += (line.match(/\{/g) || []).length;
			braceCount -= (line.match(/\}/g) || []).length;

			// Detect function/class start
			if (line.match(/^(function|class|def|async\s+function)/)) {
				inFunction = true;
			}

			// End of block
			if (inFunction && braceCount === 0) {
				blocks.push(currentBlock.trim());
				currentBlock = "";
				inFunction = false;
			}
		}

		// Add remaining content
		if (currentBlock.trim()) {
			blocks.push(currentBlock.trim());
		}

		return blocks;
	}

	splitLargeCodeBlock(codeBlock) {
		// Split large code blocks by logical boundaries
		const lines = codeBlock.split("\n");
		const chunks = [];
		let currentChunk = "";
		let currentTokens = 0;

		for (const line of lines) {
			const lineTokens = this.estimateTokens(line);

			if (currentTokens + lineTokens > this.config.chunking.maxChunkSize) {
				if (currentChunk.trim()) {
					chunks.push(currentChunk.trim());
				}
				currentChunk = line;
				currentTokens = lineTokens;
			} else {
				currentChunk += (currentChunk ? "\n" : "") + line;
				currentTokens += lineTokens;
			}
		}

		if (currentChunk.trim()) {
			chunks.push(currentChunk.trim());
		}

		return chunks;
	}

	estimateTokens(text) {
		// Rough token estimation (1 token ≈ 4 characters for English)
		return Math.ceil(text.length / 4);
	}

	getOverlapText(text, overlapTokens) {
		const words = text.split(/\s+/);
		const overlapWords = Math.min(overlapTokens, words.length);
		return words.slice(-overlapWords).join(" ");
	}

	createChunk(content, metadata, index) {
		return {
			id: `${metadata.documentId || "doc"}_chunk_${index}`,
			content: content.trim(),
			metadata: {
				...metadata,
				chunkIndex: index,
				tokenCount: this.estimateTokens(content),
				createdAt: new Date().toISOString(),
			},
		};
	}

	// Production embedding with batching and error handling
	async storeDocuments(documents, model = "mxbai-embed-large") {
		console.log(
			`Processing ${documents.length} documents with production chunking...`
		);

		// Step 1: Chunk all documents
		const allChunks = [];
		for (let i = 0; i < documents.length; i++) {
			const doc = documents[i];
			const docMetadata = {
				documentId: i,
				sourceDocument:
					typeof doc === "string"
						? doc.substring(0, 100) + "..."
						: doc.title || `Document ${i}`,
				...(typeof doc === "object" ? doc.metadata : {}),
			};

			const content = typeof doc === "string" ? doc : doc.content;
			const chunks = await this.intelligentChunk(content, docMetadata);

			console.log(`Document ${i + 1}: Generated ${chunks.length} chunks`);
			allChunks.push(...chunks);
		}

		console.log(`Total chunks to process: ${allChunks.length}`);

		// Step 2: Process embeddings in batches
		await this.processBatchedEmbeddings(allChunks, model);

		console.log(
			`Successfully stored ${allChunks.length} chunks from ${documents.length} documents`
		);
		return allChunks.length;
	}

	async processBatchedEmbeddings(chunks, model) {
		const batchSize = this.config.embedding.batchSize;
		const batches = [];

		// Create batches
		for (let i = 0; i < chunks.length; i += batchSize) {
			batches.push(chunks.slice(i, i + batchSize));
		}

		console.log(`Processing ${batches.length} batches of embeddings...`);

		// Process batches with controlled concurrency
		const semaphore = new Semaphore(this.config.embedding.concurrency);

		const batchPromises = batches.map(async (batch, batchIndex) => {
			return semaphore.acquire(async () => {
				await this.processBatch(batch, model, batchIndex);

				// Rate limiting between batches
				if (batchIndex < batches.length - 1) {
					await this.delay(this.config.embedding.rateLimitDelay);
				}
			});
		});

		await Promise.all(batchPromises);
	}

	async processBatch(chunks, model, batchIndex) {
		console.log(`Processing batch ${batchIndex + 1} (${chunks.length} chunks)`);

		const embeddings = await Promise.all(
			chunks.map((chunk) =>
				this.generateEmbeddingWithRetry(chunk.content, model)
			)
		);

		// Store chunks with embeddings
		chunks.forEach((chunk, index) => {
			if (embeddings[index]) {
				const vectorId = this.vectorStore.size;
				this.vectorStore.set(vectorId, {
					...chunk,
					embedding: embeddings[index],
					vectorId,
				});
			}
		});

		console.log(`Batch ${batchIndex + 1} completed successfully`);
	}

	async generateEmbeddingWithRetry(text, model, attempt = 1) {
		try {
			return await this.generateEmbedding(text, model);
		} catch (error) {
			if (attempt < this.config.embedding.retryAttempts) {
				console.log(`Retry attempt ${attempt} for embedding generation`);
				await this.delay(1000 * attempt); // Exponential backoff
				return this.generateEmbeddingWithRetry(text, model, attempt + 1);
			}

			console.error(
				`Failed to generate embedding after ${this.config.embedding.retryAttempts} attempts:`,
				error
			);
			return null;
		}
	}

	// Enhanced embedding generation with validation
	async generateEmbedding(text, model = "mxbai-embed-large") {
		// Validate input
		if (!text || text.trim().length === 0) {
			throw new Error("Empty text provided for embedding");
		}

		// Truncate if too long (most embedding models have limits)
		const maxLength = 8192; // tokens
		if (this.estimateTokens(text) > maxLength) {
			text = text.substring(0, maxLength * 4); // rough character limit
		}

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
				throw new Error(
					`HTTP error! status: ${response.status}, message: ${errorText}`
				);
			}

			const data = await response.json();

			// Validate embedding response
			let embedding = data.embeddings || data.embedding || data;

			if (Array.isArray(embedding[0])) {
				embedding = embedding[0];
			}

			if (!Array.isArray(embedding) || embedding.length === 0) {
				throw new Error("Invalid embedding response format");
			}

			// Validate embedding dimensions
			if (embedding.some((val) => typeof val !== "number" || isNaN(val))) {
				throw new Error("Embedding contains invalid numerical values");
			}

			return embedding;
		} catch (error) {
			console.error("Error generating embedding:", error);
			throw error;
		}
	}

	// Enhanced retrieval with re-ranking
	async retrieveRelevantDocuments(
		query,
		topK = null,
		model = "mxbai-embed-large"
	) {
		topK = topK || this.config.retrieval.defaultTopK;

		console.log(`Retrieving top ${topK} relevant documents...`);

		try {
			const queryEmbedding = await this.generateEmbedding(query, model);
			const similarities = [];

			// Calculate similarity with all stored chunks
			for (const [vectorId, chunkData] of this.vectorStore) {
				if (!chunkData.embedding) continue;

				const similarity = this.cosineSimilarity(
					queryEmbedding,
					chunkData.embedding
				);

				// Apply similarity threshold
				if (similarity >= this.config.retrieval.similarityThreshold) {
					similarities.push({
						vectorId,
						similarity,
						content: chunkData.content,
						metadata: chunkData.metadata,
						...chunkData,
					});
				}
			}

			// Sort by similarity (descending)
			similarities.sort((a, b) => b.similarity - a.similarity);

			// Apply re-ranking if enabled
			let results = similarities.slice(0, topK * 2); // Get more candidates

			if (this.config.retrieval.rerankResults && results.length > topK) {
				results = await this.rerankResults(query, results);
			}

			const finalResults = results.slice(0, topK);

			console.log(`Retrieved ${finalResults.length} relevant documents`);
			console.log(
				`Top similarity score: ${
					finalResults[0]?.similarity?.toFixed(4) || "N/A"
				}`
			);

			return finalResults;
		} catch (error) {
			console.error("Error retrieving documents:", error);
			throw error;
		}
	}

	async rerankResults(query, candidates) {
		// Simple re-ranking based on content diversity and metadata
		const reranked = [];
		const usedSources = new Set();

		for (const candidate of candidates) {
			// Prefer diverse sources
			const sourceId = candidate.metadata?.documentId;
			const diversityBonus = usedSources.has(sourceId) ? 0.95 : 1.0;

			// Boost more recent chunks
			const recencyBonus = candidate.metadata?.chunkIndex === 0 ? 1.02 : 1.0;

			candidate.rerankScore =
				candidate.similarity * diversityBonus * recencyBonus;
			reranked.push(candidate);

			if (sourceId !== undefined) {
				usedSources.add(sourceId);
			}
		}

		return reranked.sort((a, b) => b.rerankScore - a.rerankScore);
	}

	// Enhanced cosine similarity with better error handling
	cosineSimilarity(vecA, vecB) {
		if (!vecA || !vecB) {
			console.warn("Null vectors detected in similarity calculation");
			return 0;
		}

		// Handle nested arrays
		const flatVecA = Array.isArray(vecA[0]) ? vecA[0] : vecA;
		const flatVecB = Array.isArray(vecB[0]) ? vecB[0] : vecB;

		if (flatVecA.length !== flatVecB.length) {
			console.warn(
				`Vector dimension mismatch: ${flatVecA.length} vs ${flatVecB.length}`
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
			return 0;
		}

		const similarity = dotProduct / denominator;
		return isNaN(similarity) ? 0 : Math.max(-1, Math.min(1, similarity));
	}

	// Enhanced context building for better responses
	async askQuestion(
		question,
		model = "llama3.2:1b",
		embedModel = "mxbai-embed-large"
	) {
		console.log(`Question: ${question}`);

		try {
			// Auto-select model if needed
			if (!model) {
				const availableModels = await this.getAvailableGenerationModels();
				if (availableModels.length === 0) {
					throw new Error("No generation models available");
				}
				model = availableModels[0].name;
			}

			// Retrieve relevant documents
			const relevantDocs = await this.retrieveRelevantDocuments(
				question,
				5,
				embedModel
			);

			if (relevantDocs.length === 0) {
				return "I could not find relevant information to answer your question.";
			}

			// Build context from multiple chunks
			const context = this.buildContext(relevantDocs, question);

			// Generate enhanced prompt
			const prompt = this.buildPrompt(question, context, relevantDocs);

			console.log(`Using context from ${relevantDocs.length} chunks`);
			console.log(`Context length: ${context.length} characters`);

			const response = await this.generateResponse(prompt, model);
			return response;
		} catch (error) {
			console.error("Error in askQuestion:", error);
			throw error;
		}
	}

	buildContext(relevantDocs, question) {
		let context = "";
		const maxContextLength = 2000; // characters

		for (const doc of relevantDocs) {
			const addition = `\n\n--- Source (similarity: ${doc.similarity.toFixed(
				3
			)}) ---\n${doc.content}`;

			if (context.length + addition.length > maxContextLength) {
				break;
			}

			context += addition;
		}

		return context.trim();
	}

	buildPrompt(question, context, relevantDocs) {
		const sourceInfo = relevantDocs
			.map(
				(doc, i) =>
					`Source ${i + 1}: ${
						doc.metadata?.sourceDocument || "Unknown"
					} (relevance: ${(doc.similarity * 100).toFixed(1)}%)`
			)
			.join("\n");

		return `You are a helpful assistant answering questions based on the provided context.

Context Information:
${sourceInfo}

Relevant Content:
${context}

Question: ${question}

Please provide a comprehensive answer based on the context above. If the context doesn't contain sufficient information to fully answer the question, please state what information is available and what might be missing.`;
	}

	// Enhanced response generation
	async generateResponse(prompt, model = "llama3.2:1b") {
		try {
			const response = await fetch(`${this.baseUrl}/api/generate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: model,
					prompt: prompt,
					stream: false,
					options: {
						temperature: 0.7,
						top_p: 0.9,
						top_k: 40,
						num_predict: 512,
					},
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`HTTP error! status: ${response.status}, message: ${errorText}`
				);
			}

			const data = await response.json();
			return data.response || data.message || "No response generated";
		} catch (error) {
			console.error("Error generating response:", error);
			throw error;
		}
	}

	// Utility methods
	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// System health and monitoring
	async getSystemStats() {
		return {
			totalChunks: this.vectorStore.size,
			totalDocuments: new Set(
				[...this.vectorStore.values()].map((v) => v.metadata?.documentId)
			).size,
			averageChunkSize: this.calculateAverageChunkSize(),
			embeddingModel: "mxbai-embed-large",
			config: this.config,
		};
	}

	calculateAverageChunkSize() {
		if (this.vectorStore.size === 0) return 0;

		const totalTokens = [...this.vectorStore.values()].reduce(
			(sum, chunk) => sum + (chunk.metadata?.tokenCount || 0),
			0
		);

		return Math.round(totalTokens / this.vectorStore.size);
	}

	// Existing utility methods (kept for compatibility)
	async checkOllamaStatus() {
		try {
			const response = await fetch(`${this.baseUrl}/api/tags`);
			return response.ok;
		} catch (error) {
			return false;
		}
	}

	async listModels() {
		try {
			const response = await fetch(`${this.baseUrl}/api/tags`);
			const data = await response.json();
			return data.models || [];
		} catch (error) {
			console.error("Error listing models:", error);
			return [];
		}
	}

	async checkModel(modelName) {
		try {
			const models = await this.listModels();
			return models.some((model) => model.name === modelName);
		} catch (error) {
			console.error("Error checking model:", error);
			return false;
		}
	}

	async getAvailableGenerationModels() {
		try {
			const models = await this.listModels();
			return models.filter(
				(model) =>
					!model.name.includes("embed") &&
					(model.name.includes("llama") ||
						model.name.includes("mistral") ||
						model.name.includes("codellama") ||
						model.name.includes("phi") ||
						model.name.includes("gemma") ||
						model.name.includes("qwen"))
			);
		} catch (error) {
			console.error("Error getting generation models:", error);
			return [];
		}
	}
}

// Semaphore class for concurrency control
class Semaphore {
	constructor(max) {
		this.max = max;
		this.current = 0;
		this.queue = [];
	}

	async acquire(fn) {
		return new Promise((resolve, reject) => {
			this.queue.push({ fn, resolve, reject });
			this.process();
		});
	}

	async process() {
		if (this.current >= this.max || this.queue.length === 0) {
			return;
		}

		this.current++;
		const { fn, resolve, reject } = this.queue.shift();

		try {
			const result = await fn();
			resolve(result);
		} catch (error) {
			reject(error);
		} finally {
			this.current--;
			this.process();
		}
	}
}

// Enhanced example usage
async function runProductionExample() {
	const documents = [
		{
			content: `# Llama Biology and Characteristics
            
            Llamas are members of the camelid family, meaning they're pretty closely related to vicuñas and camels. These South American animals have adapted to high-altitude environments over thousands of years.
            
            ## Physical Characteristics
            Llamas can grow as much as 6 feet tall, though the average llama measures between 5 feet 6 inches and 5 feet 9 inches tall. They typically weigh between 280 and 450 pounds and can carry 25 to 30 percent of their body weight, making them excellent pack animals.
            
            ## Diet and Digestion
            Llamas are vegetarians and have very efficient digestive systems. Their three-chambered stomach allows them to extract maximum nutrition from sparse vegetation in their native highland environments.`,
			metadata: { type: "structured", source: "animal_encyclopedia" },
		},
		{
			content: `The domestication of llamas represents one of the earliest examples of livestock management in the Americas. Llamas were first domesticated and used as pack animals 4,000 to 5,000 years ago in the Peruvian highlands by the ancient Inca civilization.
            
            These hardy animals were essential to the Inca economy, providing not only transportation but also wool, meat, and even fuel from their dung. The Inca developed sophisticated breeding programs that produced llamas with different characteristics for various purposes.
            
            Today, llamas continue to be important in South American culture and economy, while also gaining popularity in North America and Europe as companion animals and livestock guardians.`,
			metadata: { type: "narrative", source: "history_textbook" },
		},
		{
			content: `# Llama Lifespan and Health
            
            ## Lifespan
            - Average lifespan: 15-20 years
            - Some llamas live up to 30 years
            - Factors affecting longevity include genetics, diet, and care
            
            ## Common Health Issues
            - Meningeal worm (from deer)
            - Heat stress in hot climates
            - Vitamin D deficiency
            - Dental problems in older animals
            
            ## Preventive Care
            Regular veterinary checkups, proper nutrition, and adequate shelter are essential for maintaining llama health.`,
			metadata: { type: "structured", source: "veterinary_guide" },
		},
	];

	const ragSystem = new ProductionOllamaRAGSystem();

	console.log("=== Production Ollama RAG System Demo ===");

	// Check system status
	const isRunning = await ragSystem.checkOllamaStatus();
	if (!isRunning) {
		console.error("Ollama is not running!");
		return;
	}

	try {
		// Store documents with advanced chunking
		console.log("\n1. Storing documents with intelligent chunking...");
		const chunkCount = await ragSystem.storeDocuments(documents);

		// Show system stats
		console.log("\n2. System Statistics:");
		const stats = await ragSystem.getSystemStats();
		console.log(JSON.stringify(stats, null, 2));

		// Test questions
		const questions = [
			"What animals are llamas related to?",
			"How were llamas used historically?",
			"What health issues do llamas face?",
			"How long do llamas typically live?",
			"What makes llamas good pack animals?",
		];

		console.log("\n3. Testing Questions:");
		for (const question of questions) {
			console.log("\n" + "=".repeat(60));
			console.log(`Q: ${question}`);
			console.log("-".repeat(60));

			const startTime = Date.now();
			const answer = await ragSystem.askQuestion(question);
			const endTime = Date.now();

			console.log(`A: ${answer}`);
			console.log(`Response time: ${endTime - startTime}ms`);
		}

		// Test advanced retrieval
		console.log("\n4. Advanced Retrieval Analysis:");
		const testQuery = "llama health and lifespan";
		const relevantDocs = await ragSystem.retrieveRelevantDocuments(
			testQuery,
			3
		);

		console.log(`\nQuery: "${testQuery}"`);
		console.log("Retrieved chunks:");
		relevantDocs.forEach((doc, i) => {
			console.log(
				`\n${i + 1}. Similarity: ${(doc.similarity * 100).toFixed(1)}%`
			);
			console.log(`   Source: ${doc.metadata?.source || "Unknown"}`);
			console.log(`   Chunk: ${doc.content.substring(0, 100)}...`);
			console.log(`   Tokens: ${doc.metadata?.tokenCount || "Unknown"}`);
		});
	} catch (error) {
		console.error("Error in production example:", error);
	}
}

// Advanced batch processing utilities
class BatchProcessor {
	constructor(ragSystem) {
		this.ragSystem = ragSystem;
		this.batchSize = 50;
		this.maxConcurrency = 8;
	}

	async processLargeDocumentCollection(documents, progressCallback = null) {
		console.log(
			`Processing ${documents.length} documents in optimized batches...`
		);

		const results = {
			processed: 0,
			failed: 0,
			totalChunks: 0,
			startTime: Date.now(),
		};

		// Process in batches to manage memory
		for (let i = 0; i < documents.length; i += this.batchSize) {
			const batch = documents.slice(i, i + this.batchSize);
			const batchNum = Math.floor(i / this.batchSize) + 1;
			const totalBatches = Math.ceil(documents.length / this.batchSize);

			console.log(
				`Processing batch ${batchNum}/${totalBatches} (${batch.length} documents)`
			);

			try {
				const chunkCount = await this.ragSystem.storeDocuments(batch);
				results.processed += batch.length;
				results.totalChunks += chunkCount;

				if (progressCallback) {
					progressCallback({
						batch: batchNum,
						totalBatches,
						processed: results.processed,
						total: documents.length,
						chunks: results.totalChunks,
					});
				}

				// Memory management - small delay between batches
				if (i + this.batchSize < documents.length) {
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			} catch (error) {
				console.error(`Batch ${batchNum} failed:`, error);
				results.failed += batch.length;
			}
		}

		results.endTime = Date.now();
		results.processingTime = results.endTime - results.startTime;

		console.log("\n=== Batch Processing Summary ===");
		console.log(
			`Documents processed: ${results.processed}/${documents.length}`
		);
		console.log(`Total chunks created: ${results.totalChunks}`);
		console.log(`Failed documents: ${results.failed}`);
		console.log(
			`Processing time: ${(results.processingTime / 1000).toFixed(2)} seconds`
		);
		console.log(
			`Average time per document: ${(
				results.processingTime / results.processed
			).toFixed(0)}ms`
		);

		return results;
	}
}

// Document loader utilities
class DocumentLoader {
	static async fromFiles(filePaths) {
		const documents = [];

		for (const filePath of filePaths) {
			try {
				// This would need to be adapted based on your file reading method
				const content = await this.readFile(filePath);
				const metadata = {
					source: filePath,
					type: this.detectFileType(filePath),
					loadedAt: new Date().toISOString(),
				};

				documents.push({ content, metadata });
			} catch (error) {
				console.error(`Failed to load ${filePath}:`, error);
			}
		}

		return documents;
	}

	static async fromText(textContent, metadata = {}) {
		return [
			{
				content: textContent,
				metadata: {
					type: "text",
					loadedAt: new Date().toISOString(),
					...metadata,
				},
			},
		];
	}

	static async fromMarkdown(markdownContent, metadata = {}) {
		return [
			{
				content: markdownContent,
				metadata: {
					type: "structured",
					format: "markdown",
					loadedAt: new Date().toISOString(),
					...metadata,
				},
			},
		];
	}

	static detectFileType(filePath) {
		const extension = filePath.split(".").pop().toLowerCase();
		const typeMap = {
			md: "structured",
			txt: "general",
			js: "code",
			py: "code",
			html: "code",
			json: "structured",
		};

		return typeMap[extension] || "general";
	}

	static async readFile(filePath) {
		// Placeholder - implement based on your environment
		// For Node.js: use fs.readFile
		// For browser: use File API
		throw new Error(
			"readFile method needs to be implemented for your environment"
		);
	}
}

// Performance monitoring utilities
class PerformanceMonitor {
	constructor() {
		this.metrics = new Map();
	}

	startTimer(operation) {
		this.metrics.set(operation, { startTime: Date.now() });
	}

	endTimer(operation, metadata = {}) {
		const entry = this.metrics.get(operation);
		if (entry) {
			entry.endTime = Date.now();
			entry.duration = entry.endTime - entry.startTime;
			entry.metadata = metadata;
		}
	}

	getMetrics() {
		const results = {};
		for (const [operation, data] of this.metrics) {
			results[operation] = {
				duration: data.duration,
				durationSeconds: (data.duration / 1000).toFixed(2),
				...data.metadata,
			};
		}
		return results;
	}

	reset() {
		this.metrics.clear();
	}
}

// Export classes for use
if (typeof module !== "undefined" && module.exports) {
	module.exports = {
		ProductionOllamaRAGSystem,
		BatchProcessor,
		DocumentLoader,
		PerformanceMonitor,
		runProductionExample,
	};
}

// Auto-run example if executed directly
if (typeof window === "undefined") {
	runProductionExample().catch(console.error);
}
