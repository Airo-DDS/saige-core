import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY is not set');
}
if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error('PINECONE_ENVIRONMENT is not set');
}
if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('PINECONE_INDEX_NAME is not set');
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Function to check if index exists and create if not
export async function ensurePineconeIndex() {
  try {
    const indexName = process.env.PINECONE_INDEX_NAME || '';
    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME is empty or not set');
    }

    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some(
      (index) => index.name === indexName,
    );

    if (!indexExists) {
      console.log(`Pinecone index "${indexName}" not found. Creating...`);
      // text-embedding-ada-002 dimension is 1536
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      console.log(`Pinecone index "${indexName}" created successfully.`);
      // Wait for index to be ready
      await new Promise((resolve) => setTimeout(resolve, 60000));
    } else {
      console.log(`Pinecone index "${indexName}" already exists.`);
    }
  } catch (error) {
    console.error('Error ensuring Pinecone index:', error);
    throw error;
  }
}
