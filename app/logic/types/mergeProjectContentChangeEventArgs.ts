import type { ProjectContentChangeEventArg } from './IProjectDatabase';

export function mergeProjectContentChangeEventArgs(
  changes: ProjectContentChangeEventArg[],
): ProjectContentChangeEventArg[] {
  const res: ProjectContentChangeEventArg[] = [];
  let current_group: {
    instigator: ProjectContentChangeEventArg['instigator'];
    aUpsIds: Set<string>;
    aDelIds: Set<string>;
    wUpsIds: Set<string>;
    wDelIds: Set<string>;
    wTchIds: Set<string>;
  } | null = null;
  function flush_current_group() {
    if (!current_group) {
      return;
    }
    res.push({
      aDelIds: [...current_group.aDelIds],
      aUpsIds: [...current_group.aUpsIds],
      wDelIds: [...current_group.wDelIds],
      wUpsIds: [...current_group.wUpsIds],
      wTchIds: [...current_group.wTchIds],
      instigator: current_group?.instigator,
    });
    current_group = null;
  }
  for (const change of changes) {
    if (!current_group || current_group.instigator !== change.instigator) {
      current_group = {
        aDelIds: new Set(),
        aUpsIds: new Set(),
        wDelIds: new Set(),
        wTchIds: new Set(),
        wUpsIds: new Set(),
        instigator: change.instigator,
      };
    }
    for (const id of change.aDelIds) {
      current_group.aDelIds.add(id);
      current_group.aUpsIds.delete(id);
    }
    for (const id of change.aUpsIds) {
      current_group.aUpsIds.add(id);
      current_group.aDelIds.delete(id);
    }
    for (const id of change.wDelIds) {
      current_group.wDelIds.add(id);
      current_group.wUpsIds.delete(id);
    }
    for (const id of change.wUpsIds) {
      current_group.wUpsIds.add(id);
      current_group.wDelIds.delete(id);
    }
    for (const id of change.wTchIds) {
      current_group.wTchIds.add(id);
    }
  }
  flush_current_group();
  return res;
}
