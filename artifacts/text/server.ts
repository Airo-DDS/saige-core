// Placeholder server implementation for text artifacts
export const textArtifactHandler = {
  create: async () => ({ id: 'text-1' }),
  get: async () => ({ id: 'text-1', content: '' }),
  update: async () => ({ id: 'text-1', content: '' }),
  delete: async () => ({ success: true }),
};
