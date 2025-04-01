// This file provides type definitions for database models

export interface User {
  id: string;
  email: string;
  password?: string;
}

export interface Chat {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: 'public' | 'private';
}

export interface Message {
  id: string;
  chatId: string;
  role: string;
  content: any;
  parts?: any[];
  attachments?: any;
  createdAt: Date;
}

export interface Vote {
  id: string;
  chatId: string;
  messageId: string;
  userId: string;
  value: number; // 1 for upvote, -1 for downvote
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  createdAt: Date;
  title: string;
  content?: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  userId: string;
}

export interface Suggestion {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description?: string;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
}
