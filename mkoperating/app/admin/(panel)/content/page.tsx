import { listTestimonials, listWorkItems } from '@/lib/db';
import { PageHeader } from '@/components/admin/ui';
import { ContentManager } from '@/components/admin/ContentManager';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  const [testimonials, work] = await Promise.all([listTestimonials(false), listWorkItems(false)]);

  return (
    <main className="px-4 py-6 sm:px-8">
      <PageHeader
        title="Content"
        sub="Testimonials and work items for the public trust pages. Publish when real."
      />
      <ContentManager testimonials={testimonials} work={work} />
    </main>
  );
}
