export interface ApplicationPayload {
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  appliedPosition: string; // Will store Department Code or Location Code
  educationLevel: string;
  experienceYears: string;
  signatureImage: File | null;
}
