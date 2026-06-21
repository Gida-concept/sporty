import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-gray-800">Page Not Found</h2>
      <p className="mt-2 max-w-md text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-brand-600 px-6 py-3 text-white transition-colors hover:bg-brand-700"
      >
        Go Home
      </Link>
    </div>
  );
}
