'use client';

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
}

export default function Loading({ text = 'Carregando...', fullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center">
      <div className="loading-spinner mb-4" />
      <p className="text-gray-400 animate-pulse">{text}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
}

// Componente de skeleton para cards
export function EventCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-48 -mx-6 -mt-6 mb-4 bg-dark-700 rounded-t-xl" />
      <div className="space-y-4">
        <div className="h-6 bg-dark-700 rounded w-3/4" />
        <div className="h-4 bg-dark-700 rounded w-full" />
        <div className="space-y-2">
          <div className="h-4 bg-dark-700 rounded w-full" />
          <div className="h-4 bg-dark-700 rounded w-2/3" />
        </div>
        <div className="grid grid-cols-3 gap-3 py-3">
          <div className="h-16 bg-dark-700 rounded" />
          <div className="h-16 bg-dark-700 rounded" />
          <div className="h-16 bg-dark-700 rounded" />
        </div>
        <div className="h-12 bg-dark-700 rounded" />
      </div>
    </div>
  );
}

