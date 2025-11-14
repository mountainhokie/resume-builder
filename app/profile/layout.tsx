import ProfileFormNav from "@/components/Profile/ProfileFormNav";

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="ml-20 p-4 md:p-8 mb-16">
        <h1 className="text-3xl mb-4 font-lustria">
          Create Your Worker Profile
        </h1>
        <div className="bg-gray-200 mx-auto w-full shadow-md rounded-2xl p-2">
          <div className="w-full flex sm:flex-row flex-col gap-4">
            <ProfileFormNav />
            <div className="w-full flex flex-col gap-4">{children}</div>
          </div>
        </div>
      </main>
    </>
  );
}
