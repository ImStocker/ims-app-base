import type { CommentReplyDTO } from '../../../../app/logic/types/CommentTypes';

export enum TargetMessageActionTypes {
  REPLY = 'reply',
  EDIT = 'edit',
}

export type TargetMessage = {
  actionType: TargetMessageActionTypes;
  message: CommentReplyDTO;
};
