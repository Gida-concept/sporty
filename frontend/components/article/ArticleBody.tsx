import { slugify } from '@/lib/formatters';

interface ContentBlock {
  type: 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'blockquote' | 'image' | 'code-block' | 'table';
  content: string;
  level?: number;
  items?: string[];
  caption?: string;
  language?: string;
  headers?: string[];
  rows?: string[][];
}

interface ArticleBodyProps {
  blocks: ContentBlock[];
  className?: string;
}

function renderBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case 'h2': {
      const id = slugify(block.content);
      return (
        <h2
          id={id}
          key={index}
          className="group scroll-mt-24 border-b border-gray-200 pb-2 mb-6 text-2xl font-bold text-gray-900"
        >
          <a href={`#${id}`} className="anchor-link" aria-label={`Link to ${block.content}`}>
            {block.content}
          </a>
        </h2>
      );
    }

    case 'h3': {
      const id = slugify(block.content);
      return (
        <h3
          id={id}
          key={index}
          className="group scroll-mt-24 mb-4 text-xl font-semibold text-gray-900"
        >
          <a href={`#${id}`} className="anchor-link" aria-label={`Link to ${block.content}`}>
            {block.content}
          </a>
        </h3>
      );
    }

    case 'p':
      return (
        <p key={index} className="mb-5 leading-relaxed text-gray-700 last:mb-0">
          {block.content}
        </p>
      );

    case 'ul':
      return (
        <ul key={index} className="mb-5 list-disc pl-6 space-y-2 text-gray-700 last:mb-0">
          {block.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol key={index} className="mb-5 list-decimal pl-6 space-y-2 text-gray-700 last:mb-0">
          {block.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );

    case 'blockquote':
      return (
        <blockquote
          key={index}
          className="mb-5 border-l-4 border-gray-300 bg-gray-50 py-3 pl-5 pr-4 italic text-gray-600 last:mb-0"
        >
          {block.content}
        </blockquote>
      );

    case 'image':
      return (
        <figure key={index} className="mb-6 last:mb-0">
          <div className="overflow-hidden rounded-lg bg-gray-100">
            <img
              src={block.content}
              alt={block.caption ?? ''}
              className="h-auto w-full max-w-full object-cover"
              loading="lazy"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-2 text-center text-sm text-gray-500">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'code-block':
      return (
        <div key={index} className="mb-5 last:mb-0">
          <div className="flex items-center justify-between rounded-t-lg bg-gray-800 px-4 py-2">
            <span className="text-xs text-gray-400">{block.language ?? 'code'}</span>
          </div>
          <pre className="overflow-x-auto rounded-b-lg bg-gray-900 p-4 text-sm text-gray-100">
            <code>{block.content}</code>
          </pre>
        </div>
      );

    case 'table':
      return (
        <div key={index} className="mb-5 overflow-x-auto last:mb-0">
          <table className="w-full border-collapse text-sm text-gray-700">
            {block.headers && block.headers.length > 0 && (
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  {block.headers.map((header, i) => (
                    <th key={i} className="px-4 py-3 text-left font-semibold text-gray-900">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows?.map((row, i) => (
                <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

export default function ArticleBody({ blocks, className = '' }: ArticleBodyProps) {
  if (!blocks || blocks.length === 0) return null;

  return <div className={className}>{blocks.map((block, index) => renderBlock(block, index))}</div>;
}
