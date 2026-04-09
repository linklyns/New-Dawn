export interface Notification {
  notificationId: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  groupKey: string | null;
}

export interface NotificationPagedResult {
  items: Notification[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}
