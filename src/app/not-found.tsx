/**
 * Shown when the Host matches no tenant, or the tenant exists but is not
 * published. Deliberately generic: it must not leak that a given company
 * exists but is unpublished.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="text-center">
        <p className="text-[13px] font-bold uppercase tracking-widest text-slate-400">404</p>
        <h1 className="mt-3 text-[26px] font-black tracking-tight text-slate-900">This site isn&apos;t available</h1>
        <p className="mt-2 max-w-md text-[14px] font-medium leading-6 text-slate-500">
          The address you followed doesn&apos;t point to a published website. Check the link, or contact
          whoever shared it with you.
        </p>
      </div>
    </main>
  );
}
