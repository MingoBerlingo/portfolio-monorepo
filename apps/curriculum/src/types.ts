export type Locale = "en" | "it";
export type SectionKey =
  | "introduction"
  | "skills"
  | "experience"
  | "education"
  | "publications"
  | "research"
  | "additional";
export type ContactKey =
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "portfolio"
  | "github";
export type CollectionKey =
  | "experiences"
  | "education"
  | "publications"
  | "research";
export interface ProfileLink {
  label: string;
  url: string;
}
export interface Profile {
  name: string;
  surname: string;
  jobPosition: string;
  presentation: string;
  email: string;
  phone: string;
  location: string;
  skills: string;
  languages: string;
  additionalInfo: string;
  github: ProfileLink;
  linkedin: ProfileLink;
  portfolio?: ProfileLink;
}
export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  industries: string;
  activities: string;
}
export interface Education {
  title: string;
  school: string;
  startDate: string;
  endDate: string;
  details: string;
}
export interface Publication {
  title: string;
  description: string;
  url: string;
}
export interface Research extends Publication {
  date: string;
  project: string;
}
export interface CVDocument {
  locale: Locale;
  profile: Profile;
  experiences: Experience[];
  education: Education[];
  publications: Publication[];
  research: Research[];
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  contactOrder?: ContactKey[];
  deletedContacts?: ContactKey[];
  deletedSections?: SectionKey[];
}
export type ExperienceEntry = Experience;
export type EducationEntry = Education;
export type PublicationEntry = Publication;
export type ResearchEntry = Research;
export interface SavedVersion {
  id: string;
  name: string;
  savedAt: string;
  document: CVDocument;
}
export interface VersionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type CVLink = ProfileLink;
export type Entry = Experience | Education | Publication | Research;
