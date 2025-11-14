import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <main className="flex align-center justify-center h-screen flex-col">
        <section className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <Link
            className="flex justify-center rounded-sm bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition hover:scale-110 hover:shadow-xl"
            href="/profile"
          >
            Profile
          </Link>

          <Link
            className="flex justify-center rounded-sm border border-current px-8 py-3 text-sm font-medium text-indigo-600 transition hover:scale-110 hover:shadow-xl"
            href="/add-job"
          >
            Add Job
          </Link>
          <Link
            className="flex justify-center rounded-sm border border-current px-8 py-3 text-sm font-medium text-indigo-600 transition hover:scale-110 hover:shadow-xl"
            href="/jobs"
          >
            Jobs
          </Link>
        </section>
        <div>
          - Add Job - Create Resume - Create Cover Letter - Update Profile
        </div>
      </main>
    </>
  );
}
