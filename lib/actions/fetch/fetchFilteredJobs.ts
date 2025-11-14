import { sql } from "@vercel/postgres";

const ITEMS_PER_PAGE = 10;
export async function fetchFilteredJobs(query: string, currentPage: number) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  console.log(offset);
  try {
    const data = await sql`
      SELECT
        *
      FROM jobs
      ORDER BY status ASC, date_applied DESC, COMPANY ASC
    `;

    return data.rows;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch job.");
  }
}
