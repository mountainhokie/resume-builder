import JobsTable from "@/components/Jobs/JobTable";
// import { fetchJobPages } from "@/lib/data";

export default async function Page(props: {
  searchParams?: Promise<{ query?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";
  const currentPage = Number(searchParams?.page) || 1;
  // const totalPages = await fetchJobPages(query);

  return (
    <>
      <main className="ml-20 p-4 md:p-8">
        <h1 className="text-3xl mb-4 font-lustria">Jobs</h1>
        <div className="w-full pb-8">
          <JobsTable query={query} currentPage={currentPage} />
        </div>
      </main>
    </>
  );
}
