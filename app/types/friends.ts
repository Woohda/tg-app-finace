/**
 * @module app/types/friends
 * @fileoverview Типы данных для системы друзей (реферальные связи и быстрый выбор в сплите)
 */

export interface UserFriend {
  id: string;
  user_id: string;
  first_name: string;
  telegram_id: number | null;
  created_at: string;
}

export interface JoinInviteResult {
  success: boolean;
  groupId?: string | null;
  groupName?: string | null;
  friendName?: string | null;
  message: string;
}
