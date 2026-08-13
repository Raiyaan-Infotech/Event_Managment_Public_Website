import { renderPage, type PageProps } from '@/app/_render';

export default function Page({ searchParams }: PageProps) {
  return renderPage({ page: 'contact', searchParams });
}
