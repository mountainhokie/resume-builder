import { fetchUserProfile } from "@/lib/actions/fetch/fetchUserProfile";
import JobForm from "@/components/Jobs/JobForm";

export default async function Page() {
  const userID = "410544b2-4001-4271-9855-fec4b6a6442a";
  const user = await fetchUserProfile(userID);
  return (
    <>
      <JobForm user={user} />
    </>
  );
}
