import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Pinecone } from '@pinecone-database/pinecone';
import { nanoid } from 'nanoid';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const KNOWLEDGE_BASE_DIR = path.resolve(__dirname, '../knowledge');
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || '';
const PINECONE_BATCH_SIZE = 100;

if (
  !process.env.PINECONE_API_KEY ||
  !process.env.PINECONE_ENVIRONMENT ||
  !PINECONE_INDEX_NAME
) {
  console.error('Missing required environment variables for embedding script.');
  process.exit(1);
}

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);

// Basic text chunking
function chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start += chunkSize - overlap;
    if (start + overlap >= text.length) break;
  }
  // Add the last potentially smaller chunk if needed
  if (
    start < text.length &&
    chunks[chunks.length - 1] !== text.substring(start)
  ) {
    chunks.push(text.substring(start));
  }
  return chunks.filter((chunk) => chunk.trim().length > 0);
}

// Create mock embeddings with dimension 1024
function createMockEmbeddings(texts: string[]): number[][] {
  return texts.map(() => {
    // Create a vector of 1024 dimensions filled with random values between -1 and 1
    // This is just for demonstration; in production you'd use real embeddings
    return Array.from({ length: 1024 }, () => Math.random() * 2 - 1);
  });
}

async function processFile(filePath: string) {
  console.log(`Processing file: ${path.basename(filePath)}`);
  const content = await fs.readFile(filePath, 'utf-8');
  const chunks = chunkText(content);
  console.log(` -> Split into ${chunks.length} chunks.`);

  const vectors = [];
  for (let i = 0; i < chunks.length; i += PINECONE_BATCH_SIZE) {
    const chunkBatch = chunks.slice(i, i + PINECONE_BATCH_SIZE);
    console.log(
      `   -> Generating mock embeddings for batch ${i / PINECONE_BATCH_SIZE + 1}...`,
    );
    const embeddings = createMockEmbeddings(chunkBatch);

    for (let j = 0; j < chunkBatch.length; j++) {
      vectors.push({
        id: `${path.basename(filePath)}-${i + j}-${nanoid(10)}`,
        values: embeddings[j],
        metadata: {
          source: path.basename(filePath),
          chunkIndex: i + j,
          text: chunkBatch[j],
        },
      });
    }
  }
  return vectors;
}

async function upsertInBatches(vectors: any[]) {
  console.log(`Upserting ${vectors.length} vectors to Pinecone...`);
  for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
    const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE);
    console.log(` -> Upserting batch ${i / PINECONE_BATCH_SIZE + 1}...`);
    try {
      await pineconeIndex.upsert(batch);
    } catch (error) {
      console.error(
        `Error upserting batch ${i / PINECONE_BATCH_SIZE + 1}:`,
        error,
      );
    }
  }
  console.log('Upsert complete.');
}

async function main() {
  console.log('Starting knowledge base mock embedding process...');

  // Process text files
  try {
    const files = await fs.readdir(KNOWLEDGE_BASE_DIR);
    const txtFiles = files.filter((file) => file.endsWith('.txt'));

    if (txtFiles.length === 0) {
      console.warn(`No .txt files found in ${KNOWLEDGE_BASE_DIR}. Exiting.`);
      return;
    }
    console.log(`Found ${txtFiles.length} .txt files.`);

    let allVectors: any[] = [];
    for (const file of txtFiles) {
      const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
      const fileVectors = await processFile(filePath);
      allVectors = allVectors.concat(fileVectors);
    }

    if (allVectors.length > 0) {
      await upsertInBatches(allVectors);
    } else {
      console.log('No vectors generated to upsert.');
    }

    console.log('Knowledge base mock embedding process finished.');
    console.log('NOTE: These are mock vectors for demonstration only!');
    console.log(
      'In production, you would need to align the dimensions of your embedding model with your Pinecone index.',
    );
  } catch (error) {
    console.error('Error processing knowledge base:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
