import { sql } from "@vercel/postgres";
import { UserFull } from "@/lib/definitions/userFull";

export async function fetchUserProfileFull(userID: string) {
  try {
    const data = await sql<UserFull>`
      SELECT 
        users.*,
      (SELECT STRING_AGG(skill, ', ')
        FROM skills
        WHERE skills.user_id = users.id) AS skills,
      (SELECT COALESCE(
          JSON_AGG(
              JSON_BUILD_OBJECT(
                  'id', employment.id,
                  'company', employment.company,
                  'position', employment.position,
                  'status', employment.status,
                  'start_date', employment.start_date,
                  'end_date', employment.end_date,
                  'duties', employment.duties
              )
              ORDER BY employment.start_date DESC
          ),
          '[]'
      )
        FROM employment
        WHERE employment.user_id = users.id) AS employment,
      (SELECT COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', education.id,
                'institution', education.institution,
                'location', education.location,
                'start_date', education.start_date,
                'end_date', education.end_date,
                'degree', education.degree,
                'minor', education.minor,
                'diploma_type', education.diploma_type
            )
        ),
        '[]'
      )
        FROM education
        WHERE education.user_id = users.id) AS education
    FROM 
        users
    WHERE 
        users.id = ${userID}  
    `;
    const user = data.rows[0];
    return user;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all user.");
  }
}
