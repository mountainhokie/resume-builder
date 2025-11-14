import EmploymentForm from "@/components/Profile/EmploymentForm";
import { fetchUserProfileFull } from "@/lib/actions/fetch/fetchUserProfileFull";

export default async function EmploymentPage() {
  const userID = "410544b2-4001-4271-9855-fec4b6a6442a";
  const user = await fetchUserProfileFull(userID);

  return (
    <>
      <EmploymentForm user={user} />
    </>
  );
}
