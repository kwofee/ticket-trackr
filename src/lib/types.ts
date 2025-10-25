export type Ticket = {
  id: string;
  title: string;
  description: string;
  raised_by: string;
  assigned_to: string;
  deadline: string;
  status: 'open' | 'in_progress' | 'completed' | 'returned';
  created_at: string;
};
