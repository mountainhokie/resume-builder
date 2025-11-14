"use server";
import { State } from "@/lib/definitions/state";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

const FormSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  institution: z.string(),
  location: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  degree: z.string(),
  minor: z.string(),
  diploma_type: z.string(),
});

const UpdateEducation = FormSchema.omit({ user_id: true });

export async function updateEducation(
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
      institution: formData.getAll("institution")[i],
      location: formData.getAll("location")[i],
      start_date: formData.getAll("start_date")[i],
      end_date: formData.getAll("end_date")[i],
      degree: formData.getAll("degree")[i],
      minor: formData.getAll("minor")[i],
      diploma_type: formData.getAll("diploma_type")[i],
    });
  }

  for (const entry of result) {
    const validatedFields = UpdateEducation.safeParse({
      id: entry["id"],
      institution: entry["institution"],
      location: entry["location"],
      minor: entry["minor"],
      start_date: entry["start_date"],
      end_date: entry["end_date"],
      degree: entry["degree"],
      diploma_type: entry["diploma_type"],
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Missing Fields. Failed to Update Education",
      };
    }

    const {
      id,
      institution,
      location,
      minor,
      start_date,
      end_date,
      degree,
      diploma_type,
    } = validatedFields.data;

    try {
      if (id) {
        await sql`
        UPDATE education
        SET institution = ${institution}, location = ${location}, minor = ${minor}, start_date = ${start_date}, end_date = ${end_date}, degree = ${degree}, diploma_type = ${diploma_type}
        WHERE id = ${id}
        `;
      } else {
        await sql`
        INSERT INTO education (user_id, institution, location, minor, start_date, end_date, degree, diploma_type)
        VALUES (${user_id}, ${institution}, ${location}, ${minor}, ${start_date}, ${end_date}, ${degree}, ${diploma_type})
        `;
      }
    } catch (error) {
      console.error(error);
      return { message: "Database Error: Failed to update education." };
    }
    console.log(id, "updated");
  }

  console.log("update");
  revalidatePath("/profile/education"); // clear cache and trigger new request
  redirect("/profile/education");
}
