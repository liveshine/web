export function generateRSS(posts: any[]): string {
  const siteUrl = 'https://studyquake.com';
  const siteTitle = 'StudyQuake - Educational Resources';
  const siteDescription = 'Educational portal for Indian competitive exams.';

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteTitle}</title>
    <link>${siteUrl}</link>
    <description>${siteDescription}</description>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
`;

  for (const post of posts) {
    if (post.status === 'draft') continue;
    
    // Add logic to not include future posts if required, but here we just include everything not draft
    
    const postUrl = `${siteUrl}/post/${post.id}`;
    const pubDate = new Date(post.createdAt?.toDate?.() || post.date).toUTCString();
    
    rss += `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.snippet}]]></description>
    </item>`;
  }

  rss += `
  </channel>
</rss>`;

  return rss;
}
