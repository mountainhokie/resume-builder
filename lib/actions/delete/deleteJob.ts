"use server";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

export async function deleteJob(id: string) {
  await sql`DELETE from jobs WHERE id = ${id}`;
  revalidatePath("/jobs");
}
