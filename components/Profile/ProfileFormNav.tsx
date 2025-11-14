"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ProfileFormNav = () => {
  const pathname = usePathname();
  return (
    <>
      <div className="sm:w-1/3 flex flex-col">
        <div className="flex flex-col gap-[2px] px-2 md:mt-8 text-black md:sticky md:top-8 max-sm:bg-white rounded-md">
          <Link
            href="/profile"
            className={`w-full text-left py-2 rounded pl-4 ${
              pathname === "/profile"
                ? "bg-purple-700 text-white"
                : "hover:bg-purple-400"
            }`}
          >
            User Profile
          </Link>
          <Link
            href="/profile/education"
            className={`w-full text-left py-2 rounded pl-4 ${
              pathname === "/profile/education"
                ? "bg-purple-700 text-white"
                : "hover:bg-purple-400"
            }`}
          >
            Education
          </Link>
          <Link
            href="/profile/employment"
            className={`w-full text-left py-2 rounded pl-4 ${
              pathname === "/profile/employment"
                ? "bg-purple-700 text-white"
                : "hover:bg-purple-400"
            }`}
          >
            Employment
          </Link>
        </div>
      </div>
    </>
  );
};

export default ProfileFormNav;
