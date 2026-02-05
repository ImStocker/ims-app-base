import type { AssetProps } from './Props';
import type { UserWithNameDTO } from './UserType';

export type CommentBlockDTO = {
  id: string;
  anchor: AssetProps;
};

export type CommentReplyChangeDTO = {
  content: AssetProps;
  answerToReplyId?: string;
};

export type CommentCreateDTO = {
  assetId: string;
  content: AssetProps;
  blocks: CommentBlockDTO[];
};

export type CommentCreateResponseDTO = {
  replyId: string;
  commentId: string;
};

export type CommentReplyDTO = {
  id: string;
  commentId: string;
  answerToId: string;
  user: UserWithNameDTO;
  content: AssetProps;
  createdAt: string;
  updatedAt: string;
  sended?: boolean;
};

export type GetCommentsResultObjectsDTO = {
  replies: {
    [key: string]: CommentReplyDTO;
  };
};

export type GetCommentsResultDTO = {
  ids: string[];
  objects: GetCommentsResultObjectsDTO;
  more: boolean;
};

export type GetCommentsParamsDTO = {
  offset?: number;
  count?: number;
};

export type AssetCommentDTO = {
  id: string;
  assetId: string;
  blocks: CommentBlockDTO[];
  updatedAt: string;
  lastViewedAt: string;
};
