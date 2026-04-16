import type { CommentReplyDTO } from '../../../../app/logic/types/CommentTypes';
import {
  castAssetPropValueToString,
  type AssetPropValue,
} from '../../../../app/logic/types/Props';

export enum TargetMessageActionTypes {
  REPLY = 'reply',
  EDIT = 'edit',
}

export type TargetMessage = {
  actionType: TargetMessageActionTypes;
  message: CommentReplyDTO;
};

export const TRUNCATE_TARGET_MESSAGE = 50;

export function getTargetMessageContent(message: AssetPropValue) {
  const res = castAssetPropValueToString(message);
  return res.substring(0, TRUNCATE_TARGET_MESSAGE).replace(/\s+/g, ' ');
}

export function isMessageEmpty(message: AssetPropValue) {
  return typeof message === 'object'
    ? !Object.keys(message as any).length
    : !message;
}

export type FailedMessageData = {
  content: AssetPropValue;
  error: string;
  answerToId?: string;
};
