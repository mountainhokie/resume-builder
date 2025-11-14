"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

const FormSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  job_title: z.string(),
  company: z.string(),
  location: z.string(),
  skills: z.string(),
  description: z.string(),
  requirements: z.string(),
  responsibilities: z.string(),
  benefits: z.string(),
  pay: z.string(),
  notes: z.string(),
  date_applied: z.string(),
  status: z.string(),
  url: z.string(),
});
const CreateJob = FormSchema.omit({ id: true, date_applied: true });

export async function createJob(formData: FormData) {
  console.log("Add Job", formData);
  const {
    user_id,
    job_title,
    company,
    location,
    skills,
    description,
    requirements,
    responsibilities,
    benefits,
    pay,
    status,
    notes,
    url,
  } = CreateJob.parse({
    user_id: formData.get("user_id"),
    job_title: formData.get("job_title"),
    company: formData.get("company"),
    location: formData.get("location"),
    skills: formData.get("skills"),
    requirements: formData.get("requirements"),
    responsibilities: formData.get("responsibilities"),
    benefits: formData.get("benefits"),
    pay: formData.get("pay"),
    description: formData.get("description"),
    notes: formData.get("notes"),
    status: formData.get("status"),
    url: formData.get("url"),
  });

  //const formData = CreateJob.parse();
  const date_applied = new Date().toISOString().split("T")[0];

  await sql`
    INSERT INTO jobs (user_id, job_title, company, location, skills, description, requirements, responsibilities, benefits, pay, notes, date_applied, status, url)
    VALUES (${user_id}, ${job_title}, ${company}, ${location}, ${skills}, ${description}, ${requirements}, ${responsibilities}, ${benefits}, ${pay}, ${notes}, ${date_applied}, ${status}, ${url})
  `;

  revalidatePath("/jobs"); // clear cache and trigger new request
  redirect("/jobs");
}
