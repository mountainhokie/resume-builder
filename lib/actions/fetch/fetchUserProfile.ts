import { sql } from "@vercel/postgres";
import { UserFull } from "../../definitions/userFull";

export async function fetchUserProfile(userID: string) {
  try {
    const data = await sql<UserFull>`
      SELECT DISTINCT ON (id)
        *
      FROM users
      WHERE id = ${userID}
    `;

    const user = data.rows[0];
    return user;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all user.");
  }
}
