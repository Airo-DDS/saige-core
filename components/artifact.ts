// Placeholder artifact component

// Types used throughout the application
export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet';

export interface Artifact {
  id: string;
  title: string;
  content?: string;
  kind: ArtifactKind;
  createdAt: Date;
}

// Create a simple artifact component to satisfy imports
export function ArtifactComponent({ artifact }: { artifact: Artifact }) {
  return null;
}
