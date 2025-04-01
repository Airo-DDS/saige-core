// Placeholder test utils for prompts
export function mockModelResponse(prompt: string) {
  return {
    prompt,
    response: 'Mocked response',
    status: 'success',
    metadata: {},
  };
}

export function testPromptCompletion(prompt: string, expectedOutput: string) {
  return mockModelResponse(prompt);
}
