// export type Ticket = {
//   id: string;
//   title: string;
//   description: string;
//   raised_by: string;
//   assigned_to: string;
//   deadline: string;
//   status: 'open' | 'in_progress' | 'completed' | 'returned';
//   created_at: string;
// };
export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  deadline: string | null;  // Add this field
  raised_by: string | { name: string; role: string }[];
  assigned_to: string | { name: string; role: string }[];
};