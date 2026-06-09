import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class ChatBlockDefinition extends BlockTypeDefinition {
  name = 'chat';
  component = async () => (await import('./ChatBlock.vue')).default;
  icon = '';
  override hideInAdding = true;
  override aiSpec =
    'This block embeds a discussion/comment thread on an asset. Props: `lastViewedAt` (string — ISO timestamp for unread tracking). Messages are CommentReplyDTO objects (stored server-side via CommentManager): { id, commentId, answerToId (parent for replies), user: {AccountId, Name}, content: AssetProps (rich text, file attachments), createdAt, updatedAt, likes: { user, emoji }[] }. Supports real-time send, edit, delete, reply, and emoji reactions. System-internal (hideInAdding=true), auto-inserted when a discussion is created.';
}
