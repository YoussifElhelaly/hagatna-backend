export interface SubmitContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PaginatedContactMessages {
  messages: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: string;
    repliedAt: Date | null;
    createdAt: Date;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
