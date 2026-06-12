import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '坑爹 — 你兄弟',
  description: '高中同学，穿一条裤子长大的兄弟，随时随地聊两句',
  openGraph: {
    title: '坑爹 — 你兄弟',
    description: '高中同学，穿一条裤子长大的兄弟，随时随地聊两句',
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
