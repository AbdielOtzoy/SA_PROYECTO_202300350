export type School = { id: string; name: string; code: string; is_active: boolean };
export type Course = { id: string; name: string; code: string; school_id: string; credits: number; is_active: boolean };
export type Semester = { id: string; year: number; term: number; is_active: boolean };
export type Professor = { id: string; full_name: string; email: string; is_active: boolean };
export type Staff = {
  course_id: string;
  professor_id: string;
  role_type: string;
  course_code: string;
  professor_name: string;
  professor_email: string;
};
export type User = { id: string; email: string; full_name: string; roles: string[]; is_active?: boolean };
export type ListResponse<T> = { [key: string]: T[] };

export const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  teacher: 'Catedrático',
  assistant: 'Auxiliar',
  student: 'Estudiante',
};

export const emptySchool = { id: '', name: '', code: '' };
export const emptyCourse = { id: '', name: '', code: '', school_id: '', credits: '4' };
export const emptySemester = { id: '', year: String(new Date().getFullYear()), term: '2' };
export const emptyProfessor = { id: '', full_name: '', email: '' };
export const emptyAssignment = { course_id: '', professor_id: '', role_type: 'professor' };

export function isInstitutionalEmail(email: string): boolean {
  return /^[^\s@]+@(ingenieria\.usac\.edu\.gt|ing\.usac\.edu\.gt)$/i.test(email.trim());
}
