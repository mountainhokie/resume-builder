import ProfileForm from "@/components/Profile/ProfileForm";
import { fetchUserProfile } from "@/lib/actions/fetch/fetchUserProfile";

export default async function Profile() {
  const userID = "410544b2-4001-4271-9855-fec4b6a6442a";
  const user = await fetchUserProfile(userID);
  return (
    <>
      <ProfileForm user={user} />
    </>
  );
}
