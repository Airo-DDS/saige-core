import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'node:path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || '';

if (!process.env.PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

async function deleteAndRecreateIndex() {
  try {
    console.log(`Attempting to delete index ${PINECONE_INDEX_NAME}...`);

    try {
      await pinecone.deleteIndex(PINECONE_INDEX_NAME);
      console.log(`Successfully deleted index ${PINECONE_INDEX_NAME}`);
    } catch (e: any) {
      console.log(`Could not delete index: ${e.message}`);
    }

    // Wait a moment for deletion to complete
    await new Promise((r) => setTimeout(r, 5000));

    console.log(
      `Creating new index ${PINECONE_INDEX_NAME} with 1536 dimensions...`,
    );
    await pinecone.createIndex({
      name: PINECONE_INDEX_NAME,
      dimension: 1536, // Updated to match the current embedding model dimension
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    });
    console.log('Index created successfully!');
    console.log('Waiting 60 seconds for the index to be ready...');
    await new Promise((resolve) => setTimeout(resolve, 60000));
    console.log('Ready to embed documents!');
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteAndRecreateIndex();
