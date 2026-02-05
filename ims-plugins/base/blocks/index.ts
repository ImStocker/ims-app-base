import { ChatBlockDefinition } from './ChatBlock/ChatBlockDefinition';
import { EmbedBlockDefinition } from './EmbedBlock/EmbedBlockDefinition';
import { GalleryDefinition } from './GalleryBlock/GalleryDefinition';
import { PropsBlockDefinition } from './PropsBlock/PropsBlockDefinition';
import { TextBlockDefinition } from './TextBlock/TextBlockDefinition';
import { ValueTableDefinition } from './ValueTableBlock/ValueTableBlockDefinition';
import { BlockMirrorBlockDefinition } from './BlockMirrorBlock/BlockMirrorBlockDefinition';
import { CollectionBlockDefinition } from './CollectionBlock/CollectionBlockDefinition';
import { ChecklistBlockDefinition } from './ChecklistBlock/ChecklistBlockDefinition';

const list = [
  new TextBlockDefinition(),
  new ValueTableDefinition(),
  new PropsBlockDefinition(),
  new GalleryDefinition(),
  new EmbedBlockDefinition(),
  new ChatBlockDefinition(),
  new ChecklistBlockDefinition(),
  new CollectionBlockDefinition(),
  new BlockMirrorBlockDefinition(),
];

export default function () {
  return list.map((el) => {
    return {
      type: 'block',
      content: {
        controller: el,
      },
    };
  });
}
