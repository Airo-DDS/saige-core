// Placeholder artifact component
import type { ReactNode } from 'react';

// Types used throughout the application
export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet';

export interface Artifact {
  id: string;
  title: string;
  content?: string;
  kind: ArtifactKind;
  createdAt: Date;
}

export interface UIArtifact extends Artifact {
  status?: 'idle' | 'streaming' | 'complete' | 'error';
  content: string;
}

export interface ArtifactAction {
  icon: ReactNode;
  label?: string;
  description: string;
  onClick: (context: any) => void | Promise<void>;
  isDisabled?: (context: any) => boolean;
}

export interface ArtifactDefinition {
  kind: ArtifactKind;
  name: string;
  icon: ReactNode;
  actions: ArtifactAction[];
  toolbar?: any[];
}

// Placeholder artifact definitions
export const artifactDefinitions: ArtifactDefinition[] = [
  {
    kind: 'text',
    name: 'Text',
    icon: null,
    actions: [],
  },
  {
    kind: 'code',
    name: 'Code',
    icon: null,
    actions: [],
  },
  {
    kind: 'image',
    name: 'Image',
    icon: null,
    actions: [],
  },
  {
    kind: 'sheet',
    name: 'Sheet',
    icon: null,
    actions: [],
  },
];

// Create a simple artifact component to satisfy imports
export function ArtifactComponent({ artifact }: { artifact: Artifact }) {
  return null;
}
