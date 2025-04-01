// Placeholder artifact hook to satisfy imports
import { Artifact } from '@/components/artifact';

export function useArtifact(id?: string) {
  return {
    artifact: null as Artifact | null,
    loading: false,
    error: null,
    refetch: async () => {},
    update: async () => {},
    delete: async () => {},
  };
}

export function useArtifactSuggestions(artifactId: string) {
  return {
    suggestions: [],
    loading: false,
    error: null,
    refetch: async () => {},
  };
}

export function useArtifactVersions(artifactId: string) {
  return {
    versions: [],
    loading: false,
    error: null,
    refetch: async () => {},
  };
}
