export interface EnrollmentsQuery {
  user_id?: string;
  userId?: string;
  semester?: string;
  status?: string;
  credentials?: string;
}

export interface EnrollmentsResponse {
  enrollments: Array<{
    user_id: string;
    course_id: string;
    course_code: string;
    course_name: string;
    credits: number;
    semester_id: string;
    semester: string;
    semester_year: number;
    semester_term: number;
    status: string;
    credentials: string;
  }>;
}
