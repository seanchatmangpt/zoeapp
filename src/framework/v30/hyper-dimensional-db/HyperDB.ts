import { generateBlake3ReceiptHash } from '../../../lib/crypto/receipts';

/**
 * Result of a state mutation operation.
 */
export interface MutationResult {
  status: 'accepted' | 'rejected';
  similarity: number;
  receipt?: string;
  reason?: string;
}

/**
 * Hyper-Dimensional Vector Database Abstraction
 * Projects JSON state into high-dimensional vectors for semantic similarity retrieval.
 */
export class HyperDB {
  private dimensions: number;
  private vectors: Map<string, Float64Array> = new Map();
  private data: Map<string, any> = new Map();
  private baseBoundaries: Map<string, Float64Array> = new Map();
  private baseBoundaryStates: Map<string, any> = new Map();
  private quarantined: Map<string, any> = new Map();
  private receipts: Map<string, string> = new Map();
  private projectionMatrix: Float64Array[];

  /**
   * Initializes the HyperDB with a specific dimensionality.
   * @param dimensions Target dimensionality (e.g., 10000)
   * @param seed Random seed for reproducible projection
   */
  constructor(dimensions: number = 10000, seed: number = 42) {
    this.dimensions = dimensions;
    this.projectionMatrix = this.generateProjectionMatrix(seed);
  }

  // Deterministic pseudo-random number generator (LCG)
  private random(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // Generate a random projection matrix (Gaussian distribution approximation)
  private generateProjectionMatrix(seed: number): Float64Array[] {
    const rng = this.random(seed);
    const matrix: Float64Array[] = [];
    const inputDim = 256; // Character set limit for simple string encoding
    
    for (let i = 0; i < inputDim; i++) {
      const row = new Float64Array(this.dimensions);
      for (let j = 0; j < this.dimensions; j++) {
        // Box-Muller transform for normal distribution
        let u1 = rng() || 1e-7; // Prevent log(0)
        let u2 = rng();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        row[j] = z0;
      }
      matrix.push(row);
    }
    return matrix;
  }

  // Projects JSON state to a normalized vector
  private projectToVector(json: any): Float64Array {
    const vector = new Float64Array(this.dimensions);
    const jsonString = JSON.stringify(json);
    
    if (!jsonString) return vector;

    // Map characters through the projection matrix
    for (let i = 0; i < jsonString.length; i++) {
        const charCode = jsonString.charCodeAt(i) % 256;
        const row = this.projectionMatrix[charCode];
        
        // Add positional encoding to capture structure
        const positionalWeight = Math.sin((i + 1) / jsonString.length * Math.PI);
        
        for (let j = 0; j < this.dimensions; j++) {
            vector[j] += row[j] * positionalWeight;
        }
    }

    // L2 Normalization
    let sumSquares = 0;
    for (let i = 0; i < this.dimensions; i++) {
        sumSquares += vector[i] * vector[i];
    }
    
    const magnitude = Math.sqrt(sumSquares) || 1;
    for (let i = 0; i < this.dimensions; i++) {
        vector[i] /= magnitude;
    }

    return vector;
  }

  /**
   * Explicitly sets the ontology's base boundary for a specific ID.
   * @param id Unique identifier
   * @param state The baseline state representing the ontology boundary
   */
  public setBaseBoundary(id: string, state: any): void {
    const vector = this.projectToVector(state);
    this.baseBoundaries.set(id, vector);
    this.baseBoundaryStates.set(id, state);
  }

  /**
   * Retrieves the ontology's base boundary state for a specific ID.
   */
  public getBaseBoundary(id: string): any | undefined {
    return this.baseBoundaryStates.get(id);
  }

  /**
   * Retrieves the quarantined state for a specific ID.
   */
  public getQuarantined(id: string): any | undefined {
    return this.quarantined.get(id);
  }

  /**
   * Clears the quarantine for a specific ID.
   */
  public clearQuarantine(id: string): void {
    this.quarantined.delete(id);
  }

  /**
   * Retrieves the cryptographic receipt hash for a specific ID.
   */
  public getReceipt(id: string): string | undefined {
    return this.receipts.get(id);
  }

  /**
   * Inserts or updates state in the database, enforcing semantic similarity constraints.
   * @param id Unique identifier
   * @param state Any JSON-serializable state
   * @returns MutationResult indicating if the mutation was accepted or rejected/quarantined
   */
  public insert(id: string, state: any): MutationResult {
    const vector = this.projectToVector(state);

    // If there is no base boundary, the first insertion establishes it as the base boundary.
    if (!this.baseBoundaries.has(id)) {
      this.baseBoundaries.set(id, vector);
      this.baseBoundaryStates.set(id, state);
    }

    const baseVector = this.baseBoundaries.get(id)!;
    const similarity = this.cosineSimilarity(vector, baseVector);

    // Semantic Quarantine Gate: Similarity must be >= 0.85
    if (similarity < 0.85) {
      this.quarantined.set(id, state);
      return {
        status: 'rejected',
        similarity,
        reason: `State mutation rejected. Cosine similarity (${similarity.toFixed(4)}) is below the ontology base boundary threshold of 0.85.`
      };
    }

    // Accept mutation: update database state
    this.vectors.set(id, vector);
    this.data.set(id, state);

    // Generate cryptographic receipt
    const prevReceipt = this.receipts.get(id);
    const nextReceipt = generateBlake3ReceiptHash(prevReceipt, state);
    this.receipts.set(id, nextReceipt);

    // Clear quarantine upon successful update
    this.quarantined.delete(id);

    return {
      status: 'accepted',
      similarity,
      receipt: nextReceipt
    };
  }

  /**
   * Alias for insert to update state.
   */
  public update(id: string, state: any): MutationResult {
    return this.insert(id, state);
  }

  /**
   * Retrieves state by ID.
   */
  public get(id: string): any | undefined {
    return this.data.get(id);
  }

  /**
   * Deletes state by ID and cleans up boundary, quarantine, and receipt tracking.
   */
  public delete(id: string): void {
    this.vectors.delete(id);
    this.data.delete(id);
    this.baseBoundaries.delete(id);
    this.baseBoundaryStates.delete(id);
    this.quarantined.delete(id);
    this.receipts.delete(id);
  }

  /**
   * Computes cosine similarity between two L2-normalized vectors.
   */
  private cosineSimilarity(vecA: Float64Array, vecB: Float64Array): number {
    let isZeroA = true;
    let isZeroB = true;
    for (let i = 0; i < this.dimensions; i++) {
      if (vecA[i] !== 0) isZeroA = false;
      if (vecB[i] !== 0) isZeroB = false;
    }
    if (isZeroA && isZeroB) return 1.0;
    if (isZeroA || isZeroB) return 0.0;

    let dotProduct = 0;
    for (let i = 0; i < this.dimensions; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
  }

  /**
   * Searches for similar states using hyper-dimensional vectors.
   * @param queryState The state to query
   * @param topK Number of results to return
   * @returns Array of matching items with similarity scores
   */
  public search(queryState: any, topK: number = 5): Array<{ id: string, state: any, score: number }> {
    const queryVector = this.projectToVector(queryState);
    const results: Array<{ id: string, state: any, score: number }> = [];

    for (const [id, vector] of this.vectors.entries()) {
      const score = this.cosineSimilarity(queryVector, vector);
      results.push({ id, state: this.data.get(id), score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}
