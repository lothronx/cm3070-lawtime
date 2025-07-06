import { Database } from "@/types/supabase";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];

// Extended task type with joined client data
export type TaskWithClient = Task & {
  clients: Pick<Client, 'client_name'> | null;
};

export const mockClients: Client[] = [
  {
    id: 101,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "ACME Corporation",
    created_at: "2025-08-17T09:15:00+08:00"
  },
  {
    id: 102,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "New Horizons LLC",
    created_at: "2025-08-17T22:42:00+08:00"
  },
  {
    id: 103,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "Smith & Associates",
    created_at: "2025-08-15T14:30:00+08:00"
  }
];

export const mockTasks: TaskWithClient[] = [
  // Upcoming task with court hearing (OCR source)
  {
    id: 5001,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: 101,
    title: "Court Hearing for ACME Corp",
    event_time: "2025-09-05T09:00:00+08:00",
    location: "Chaoyang Court Room 5",
    note: "Case number: (2025)J0105S0001",
    is_completed: false,
    source_type: "ocr",
    notification_sent: false,
    created_at: "2025-08-17T11:00:00+08:00",
    clients: { client_name: "ACME Corporation" }
  },
  
  // Upcoming task with manual entry (no client)
  {
    id: 5002,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: null,
    title: "Review Legal Documents",
    event_time: "2025-08-28T14:00:00+08:00",
    location: null,
    note: null,
    is_completed: false,
    source_type: "manual",
    notification_sent: false,
    created_at: "2025-08-20T10:30:00+08:00",
    clients: null
  },
  
  // Overdue task (should show in red/urgent)
  {
    id: 5003,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: 102,
    title: "Submit Contract Amendment",
    event_time: "2025-08-25T17:00:00+08:00",
    location: "Client Office",
    note: "Priority: High - Contract expires soon",
    is_completed: false,
    source_type: "asr",
    notification_sent: true,
    created_at: "2025-08-15T09:00:00+08:00",
    clients: { client_name: "New Horizons LLC" }
  },
  
  // Completed task
  {
    id: 5004,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: 103,
    title: "Client Meeting - Case Strategy",
    event_time: "2025-08-20T10:00:00+08:00",
    location: "Main Office Conference Room",
    note: "Discussed witness list and evidence collection",
    is_completed: true,
    source_type: "manual",
    notification_sent: true,
    created_at: "2025-08-18T16:20:00+08:00",
    clients: { client_name: "Smith & Associates" }
  },
  
  // Task with very long title (edge case)
  {
    id: 5005,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: 101,
    title: "Prepare comprehensive legal brief for complex multi-jurisdictional intellectual property dispute case involving multiple defendants",
    event_time: "2025-09-10T09:30:00+08:00",
    location: "Law Library",
    note: "Research precedents from EU, US, and Canadian courts",
    is_completed: false,
    source_type: "ocr",
    notification_sent: false,
    created_at: "2025-08-21T15:45:00+08:00",
    clients: { client_name: "ACME Corporation" }
  },
  
  // Unscheduled task (no event_time)
  {
    id: 5006,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: 102,
    title: "Follow up on discovery requests",
    event_time: null,
    location: null,
    note: "Pending client approval for additional document requests",
    is_completed: false,
    source_type: "manual",
    notification_sent: false,
    created_at: "2025-08-22T11:15:00+08:00",
    clients: { client_name: "New Horizons LLC" }
  },
  
  // Task with very long location (edge case)
  {
    id: 5007,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: 103,
    title: "Deposition",
    event_time: "2025-09-03T13:00:00+08:00",
    location: "Federal District Court Building, Suite 402, Conference Room B, 123 Justice Avenue, Downtown Legal District",
    note: "Witness: John Doe - Expert testimony on financial analysis",
    is_completed: false,
    source_type: "asr",
    notification_sent: false,
    created_at: "2025-08-19T14:30:00+08:00",
    clients: { client_name: "Smith & Associates" }
  },
  
  // Task today (current date edge case)
  {
    id: 5008,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: null,
    title: "File Motion to Dismiss",
    event_time: "2025-08-27T16:30:00+08:00",
    location: "District Court Clerk's Office",
    note: "Deadline: 5:00 PM today",
    is_completed: false,
    source_type: "manual",
    notification_sent: true,
    created_at: "2025-08-27T08:00:00+08:00",
    clients: null
  },
  
  // Early morning task (time edge case)
  {
    id: 5009,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: 101,
    title: "Emergency Hearing",
    event_time: "2025-08-30T06:00:00+08:00",
    location: "Emergency Court Room 1",
    note: "TRO hearing - urgent matter",
    is_completed: false,
    source_type: "asr",
    notification_sent: false,
    created_at: "2025-08-26T22:45:00+08:00",
    clients: { client_name: "ACME Corporation" }
  },
  
  // Late night task (time edge case)
  {
    id: 5010,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_id: 102,
    title: "Prepare Filing Documents",
    event_time: "2025-08-29T23:59:00+08:00",
    location: "Home Office",
    note: "Last-minute filing before midnight deadline",
    is_completed: false,
    source_type: "manual",
    notification_sent: false,
    created_at: "2025-08-29T18:00:00+08:00",
    clients: { client_name: "New Horizons LLC" }
  }
];