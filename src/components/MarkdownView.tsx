import { useEffect, useState } from 'react';
import { Box, Spinner } from '@cloudscape-design/components';
import { getUrl } from 'aws-amplify/storage';
import MDEditor from '@uiw/react-md-editor';

const AMPLIFY_IMAGE_PREFIX = 'amplify://';

function ResolvedMarkdownImage({
  src = '',
  alt,
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(src.startsWith(AMPLIFY_IMAGE_PREFIX));

  useEffect(() => {
    let isCancelled = false;

    const resolveImageUrl = async () => {
      if (!src || !src.startsWith(AMPLIFY_IMAGE_PREFIX)) {
        setResolvedSrc(src);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const path = src.slice(AMPLIFY_IMAGE_PREFIX.length);

      try {
        const { url } = await getUrl({ path });
        if (!isCancelled) {
          setResolvedSrc(url.toString());
        }
      } catch {
        if (!isCancelled) {
          setResolvedSrc('');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void resolveImageUrl();

    return () => {
      isCancelled = true;
    };
  }, [src]);

  if (isLoading) {
    return (
      <Box>
        <Spinner />
      </Box>
    );
  }

  if (!resolvedSrc) {
    return <Box color="text-status-inactive">Image unavailable.</Box>;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      style={{
        maxWidth: '100%',
        borderRadius: '8px',
      }}
    />
  );
}

type MarkdownViewProps = {
  content: string;
};

export function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <div data-color-mode="dark">
      <MDEditor.Markdown
        source={content}
        components={{
          img: (props) => <ResolvedMarkdownImage {...props} />,
        }}
      />
    </div>
  );
}
