import { Education } from "./education";
import { Employment } from "./employment";

export type UserFull = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  portfolio: string;
  linkedin: string;
  github: string;
  position: string;
  summary: string;
  skills: string;
  employment: Employment[];
  education: Education[];
};
