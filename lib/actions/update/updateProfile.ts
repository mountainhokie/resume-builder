"use server";
import { State } from "@/lib/definitions/state";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

const FormSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string(),
  street_address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  portfolio: z.string(),
  linkedin: z.string(),
  github: z.string(),
  position: z.string(),
  summary: z.string(),
});

const UpdateProfile = FormSchema.omit({ id: true });

export async function updateProfile(
  id: string,
  prevState: State,
  formData: FormData
) {
  const validatedFields = UpdateProfile.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    street_address: formData.get("street_address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    portfolio: formData.get("portfolio"),
    linkedin: formData.get("linkedin"),
    github: formData.get("github"),
    position: formData.get("position"),
    summary: formData.get("summary"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Job",
    };
  }

  const {
    first_name,
    last_name,
    email,
    phone,
    street_address,
    city,
    state,
    zip,
    portfolio,
    linkedin,
    github,
    position,
    summary,
  } = validatedFields.data;

  try {
    await sql`
      UPDATE users
      SET first_name = ${first_name}, last_name = ${last_name}, email = ${email}, phone = ${phone}, 
          street_address = ${street_address}, city = ${city}, state = ${state}, zip = ${zip}, 
          portfolio = ${portfolio}, linkedin = ${linkedin}, github = ${github}, 
          position = ${position}, summary = ${summary}    
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error(error);
    return { message: "Database Error: Failed to update job." };
  }
  console.log("update");
  revalidatePath("/profile"); // clear cache and trigger new request
  redirect("/profile");
}
