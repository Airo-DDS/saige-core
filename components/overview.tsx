'use client';

export function Overview() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold">Welcome to Saige</h1>
        <p className="text-muted-foreground">
          Your AI assistant for dental practice staff training.
        </p>
        <p className="text-muted-foreground">
          Ask questions about dental procedures, practice management, or
          training topics.
        </p>
      </div>
    </div>
  );
}
