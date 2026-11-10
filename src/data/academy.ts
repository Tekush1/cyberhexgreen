// The CyberHx Academy (academy.cyberhx.com): the platform a college runs its cybersecurity teaching on.
// Sold per student seat (see data/seats.ts, list "academic"); teacher seats are free.
// Every line here describes something that exists in the Academy today.

export const academyUrl = 'https://academy.cyberhx.com';

export interface AcademyFeature {
  title: string;
  text: string;
}

/** For the teacher and the department. */
export const teacherFeatures: AcademyFeature[] = [
  { title: 'Teacher dashboard', text: 'Your classes with their join codes, what each class is working on, and every student’s progress in one view. Charts for activity, accuracy and topics.' },
  { title: 'Exams', text: 'Build a paper from our challenges or your own, set the window and a per-student timer, publish it to a class. Read scores, solves, wrong flags and time taken.' },
  { title: 'Syllabus', text: 'Plan the year month by month, link topics to labs and challenges, tick them off as you teach, and publish the plan to students. Next year starts from a copy.' },
  { title: 'Schedule', text: 'The college’s month on one calendar: classes, labs, challenge days, deadlines and events. Exams appear on their own; students see what is meant for them.' },
  { title: 'Reports', text: 'A class or the whole college over any dates: who was active, what they solved, lab progress and exam scores. Export to CSV or print for the department file.' },
  { title: 'Your own challenges', text: 'Teachers write challenges only your students can see, for practice or for an exam paper.' },
];

/** For the students. */
export const studentFeatures: AcademyFeature[] = [
  { title: 'Daily labs', text: 'Short, guided labs in learning tracks, with streaks and points.' },
  { title: 'Practice challenges', text: 'The CyberHx challenge library, open for practice all year, with hints.' },
  { title: 'Leaderboards', text: 'The class, the college, the world, and colleges against each other.' },
];

/** For the people who set it up. */
export const setupFeatures: AcademyFeature[] = [
  { title: 'Bring students in', text: 'Import a spreadsheet, send invites, or let students join with a class code or the college email.' },
  { title: 'Your college, your name', text: 'Your logo on the college pages, a head of department who manages the teachers, and an option to keep your college private.' },
  { title: 'Seats and dates', text: 'A plan for a number of student seats and a period. Teacher seats are free.' },
];
