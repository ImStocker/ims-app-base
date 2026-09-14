import { ChatBlockDefinition } from './ChatBlock/ChatBlockDefinition';
import { CommentBlockDefinition } from './CommentBlock/CommentBlockDefinition';
import { EmbedBlockDefinition } from './EmbedBlock/EmbedBlockDefinition';
import { GalleryDefinition } from './GalleryBlock/GalleryDefinition';
import { PropsBlockDefinition } from './PropsBlock/PropsBlockDefinition';
import { PropBlockDefinition } from './PropBlock/PropBlockDefinition';
import { TextBlockDefinition } from './TextBlock/TextBlockDefinition';
import { ValueTableDefinition } from './ValueTableBlock/ValueTableBlockDefinition';
import { BlockMirrorBlockDefinition } from './BlockMirrorBlock/BlockMirrorBlockDefinition';
import { CollectionBlockDefinition } from './CollectionBlock/CollectionBlockDefinition';
import { ChecklistBlockDefinition } from './ChecklistBlock/ChecklistBlockDefinition';
import { MarkdownBlockDefinition } from './MarkdownBlock/MarkdownBlockDefinition';
import { AssetListBlockDefinition } from './AssetListBlock/AssetListBlockDefinition';

const list = [
  new TextBlockDefinition(),
  new MarkdownBlockDefinition(),
  new ValueTableDefinition(),
  new PropsBlockDefinition(),
  new PropBlockDefinition(),
  new GalleryDefinition(),
  new CommentBlockDefinition(),
  new EmbedBlockDefinition(),
  new ChatBlockDefinition(),
  new ChecklistBlockDefinition(),
  new CollectionBlockDefinition(),
  new BlockMirrorBlockDefinition(),
  new AssetListBlockDefinition(),
];

export default function () {
  return list.map((el) => {
    return {
      type: 'block',
      content: {
        definition: el,
      },
    };
  });
}
