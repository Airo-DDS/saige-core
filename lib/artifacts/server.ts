// import { codeArtifactHandler } from '@/artifacts/code/server';
// import { imageArtifactHandler } from '@/artifacts/image/server';
// import { sheetArtifactHandler } from '@/artifacts/sheet/server';
// import { textArtifactHandler } from '@/artifacts/text/server';
import type { ArtifactKind } from '@/components/artifact';
import type { DataStreamWriter } from 'ai';
import type { Document } from '../db/schema';
import { saveDocument } from '../db/queries';
import type { Session } from 'next-auth';

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}

export interface CreateDocumentCallbackProps {
  id: string;
  title: string;
  dataStream: DataStreamWriter;
  session: Session;
}

export interface UpdateDocumentCallbackProps {
  document: Document;
  description: string;
  dataStream: DataStreamWriter;
  session: Session;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
        session: args.session,
      });

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        session: args.session,
      });

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
// Define basic placeholder handlers that conform to the DocumentHandler interface
const textArtifactHandlerPlaceholder: DocumentHandler<'text'> = {
  kind: 'text',
  onCreateDocument: async () => {
    console.log('text create called');
    return;
  },
  onUpdateDocument: async () => {
    console.log('text update called');
    return;
  },
};

const codeArtifactHandlerPlaceholder: DocumentHandler<'code'> = {
  kind: 'code',
  onCreateDocument: async () => {
    console.log('code create called');
    return;
  },
  onUpdateDocument: async () => {
    console.log('code update called');
    return;
  },
};

const imageArtifactHandlerPlaceholder: DocumentHandler<'image'> = {
  kind: 'image',
  onCreateDocument: async () => {
    console.log('image create called');
    return;
  },
  onUpdateDocument: async () => {
    console.log('image update called');
    return;
  },
};

const sheetArtifactHandlerPlaceholder: DocumentHandler<'sheet'> = {
  kind: 'sheet',
  onCreateDocument: async () => {
    console.log('sheet create called');
    return;
  },
  onUpdateDocument: async () => {
    console.log('sheet update called');
    return;
  },
};

export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textArtifactHandlerPlaceholder,
  codeArtifactHandlerPlaceholder,
  imageArtifactHandlerPlaceholder,
  sheetArtifactHandlerPlaceholder,
];

export const artifactKinds = ['text', 'code', 'image', 'sheet'] as const;

export function getArtifactHandler(kind: ArtifactKind) {
  switch (kind) {
    case 'code':
      return codeArtifactHandlerPlaceholder;
    case 'image':
      return imageArtifactHandlerPlaceholder;
    case 'sheet':
      return sheetArtifactHandlerPlaceholder;
    case 'text':
      return textArtifactHandlerPlaceholder;
    default:
      return textArtifactHandlerPlaceholder;
  }
}
