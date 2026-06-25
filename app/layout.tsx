import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '赛博坑爹',
  description: '嘻嘻，好爽啊。一个写嵌入式代码的矛盾体，没办法。',
  openGraph: {
    title: '赛博坑爹',
    description: '嘻嘻，好爽啊。一个写嵌入式代码的矛盾体，没办法。',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
