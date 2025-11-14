"use server";

import { State } from "@/lib/definitions/state";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

const FormSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  position: z.string(),
  company: z.string(),
  status: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  duties: z.string(),
});

const UpdateEmployment = FormSchema.omit({ user_id: true });

export async function updateEmployment(
  user_id: string,
  prevState: State,
  formData: FormData
) {
  console.log("FORM DATA", formData);

  const length = formData.getAll("id").length;
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push({
      id: formData.getAll("id")[i],
      position: formData.getAll("position")[i],
      company: formData.getAll("company")[i],
      status: formData.getAll("status")[i],
      start_date: formData.getAll("start_date")[i],
      end_date: formData.getAll("end_date")[i],
      duties: formData.getAll("duties")[i],
    });
  }

  for (const entry of result) {
    const validatedFields = UpdateEmployment.safeParse({
      id: entry["id"],
      position: entry["position"],
      company: entry["company"],
      status: entry["status"],
      start_date: entry["start_date"],
      end_date: entry["end_date"],
      duties: entry["duties"],
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Missing Fields. Failed to Update Employment",
      };
    }

    const { id, position, company, status, start_date, end_date, duties } =
      validatedFields.data;

    try {
      if (id) {
        await sql`
        UPDATE employment
        SET position = ${position}, company = ${company}, status = ${status}, start_date = ${start_date}, end_date = ${end_date},  duties = ${duties}
        WHERE id = ${id}
        `;
      } else {
        await sql`
        INSERT INTO employment (user_id, position, company, status, start_date, end_date, duties)
        VALUES(${user_id}, ${position}, ${company}, ${status}, ${start_date}, ${end_date}, ${duties})        
        `;
      }
    } catch (error) {
      console.error(error);
      return { message: "Database Error: Failed to update employment." };
    }
    console.log(id, "updated");
  }

  console.log("update");
  revalidatePath("/profile/employment"); // clear cache and trigger new request
  redirect("/profile/employment");
}
