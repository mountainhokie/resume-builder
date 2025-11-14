"use server";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

export async function deleteEmployment(id: string) {
  await sql`DELETE from employment WHERE id = ${id}`;
  revalidatePath("/profile/employment");
}
