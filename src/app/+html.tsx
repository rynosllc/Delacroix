import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Root HTML for the web build. The preview tags are what Messages (and other
// apps) show when a sender texts a gift link — the page itself fills in the
// personal details once it opens.
const TITLE = 'A gift is waiting for you';
const DESCRIPTION = 'Open it — it’s from the heart. Sent with DeLacroix.';
const IMAGE = 'https://delacroix.expo.app/og-gift.png';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>DeLacroix</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content="#07130A" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DeLacroix" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content={IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={IMAGE} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'body{background-color:#07130A;}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
