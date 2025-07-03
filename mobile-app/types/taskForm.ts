export interface TaskFormData {
  title: string;
  client: string | null;
  datetime: Date | null;
  location: string | null;
  note: string | null;
}