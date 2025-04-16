import dotenv from 'dotenv';
import path from 'node:path';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || '';

if (
  !process.env.PINECONE_API_KEY ||
  !process.env.PINECONE_ENVIRONMENT ||
  !PINECONE_INDEX_NAME
) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);

async function checkFileInIndex() {
  // Get the filename from command line arguments
  const args = process.argv.slice(2);
  const filename = args[0];

  if (!filename) {
    console.error(
      'Please provide a filename to check. Example: npx tsx scripts/check-indexed-file.ts "New Document.txt"',
    );
    process.exit(1);
  }

  console.log(`Checking if file "${filename}" exists in Pinecone index...`);

  try {
    // Create a dummy vector of the right dimension (1536 for text-embedding-3-small)
    const dummyVector = Array(1536).fill(0);

    // Query for vectors with metadata.source matching the filename
    const queryResponse = await pineconeIndex.query({
      vector: dummyVector,
      topK: 10,
      filter: {
        source: filename,
      },
      includeMetadata: true,
    });

    if (queryResponse.matches && queryResponse.matches.length > 0) {
      console.log(`✅ File "${filename}" is indexed in Pinecone.`);
      console.log(`Found ${queryResponse.matches.length} matching vector(s).`);

      // Display sample of the indexed content
      if (queryResponse.matches[0].metadata) {
        const metadata = queryResponse.matches[0].metadata as any;
        console.log('\nSample content:');
        console.log('-------------');
        console.log(`${metadata.text.substring(0, 300)}...`);
        console.log('-------------');
      }
    } else {
      console.log(`❌ File "${filename}" is NOT found in the Pinecone index.`);
    }
  } catch (error) {
    console.error('Error checking Pinecone index:', error);
    process.exit(1);
  }
}

checkFileInIndex().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
