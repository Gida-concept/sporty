interface MetaTagsProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: 'article' | 'website';
  publishedTime?: string;
  author?: string;
  category?: string;
  tags?: string[];
}

export default function MetaTags({
  title,
  description,
  url,
  image = '/images/og-default.jpg',
  type = 'article',
  publishedTime,
  author = 'GameDayWire',
  category,
  tags,
}: MetaTagsProps) {
  return (
    <>
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="GameDayWire" />
      <meta property="og:locale" content="en_US" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {category && <meta property="article:section" content={category} />}
      {tags?.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <link rel="canonical" href={url} />
    </>
  );
}
