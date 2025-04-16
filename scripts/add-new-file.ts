import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { nanoid } from 'nanoid';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const KNOWLEDGE_BASE_DIR = path.resolve(__dirname, '../knowledge');
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || '';
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions
const PINECONE_BATCH_SIZE = 100;

if (
  !process.env.PINECONE_API_KEY ||
  !process.env.PINECONE_ENVIRONMENT ||
  !PINECONE_INDEX_NAME ||
  !process.env.OPENAI_API_KEY
) {
  console.error('Missing required environment variables for embedding script.');
  process.exit(1);
}

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }
  try {
    const response = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: texts.map((text) => text.replace(/\n/g, ' ')),
    });
    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error('Error getting embeddings from OpenAI:', error);
    throw error;
  }
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
      `   -> Generating embeddings for batch ${i / PINECONE_BATCH_SIZE + 1}...`,
    );
    const embeddings = await getEmbeddings(chunkBatch);

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
  // Get the filename from command line arguments
  const args = process.argv.slice(2);
  const filename = args[0];

  if (!filename) {
    console.error(
      'Please provide a filename to index. Example: npx tsx scripts/add-new-file.ts "New Document.txt"',
    );
    process.exit(1);
  }

  console.log(`Starting indexing process for file: ${filename}`);

  // Ensure Pinecone index exists before proceeding
  try {
    const indexName = PINECONE_INDEX_NAME;
    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some(
      (index) => index.name === indexName,
    );

    if (!indexExists) {
      console.error(
        `Pinecone index "${indexName}" does not exist. Please run recreateIndex.ts first.`,
      );
      process.exit(1);
    } else {
      console.log(`Using existing Pinecone index "${indexName}".`);
    }
  } catch (error) {
    console.error('Error checking Pinecone index:', error);
    process.exit(1);
  }

  // Process the specified file
  try {
    const filePath = path.join(KNOWLEDGE_BASE_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`File "${filename}" not found in knowledge directory.`);
      console.log(`Available files in ${KNOWLEDGE_BASE_DIR}:`);
      const files = await fs.readdir(KNOWLEDGE_BASE_DIR);
      files
        .filter((file) => file.endsWith('.txt'))
        .forEach((file) => console.log(` - ${file}`));
      process.exit(1);
    }

    const fileVectors = await processFile(filePath);

    if (fileVectors.length > 0) {
      await upsertInBatches(fileVectors);
      console.log(`Successfully indexed file: ${filename}`);
    } else {
      console.log('No vectors generated to upsert.');
    }
  } catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
