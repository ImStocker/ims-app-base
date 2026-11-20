import {
  AssetChanger,
  type HistorySaveRequest,
  type HistorySaveResponse,
} from './AssetChanger';

/**
 * Two rapid saveChanges() calls (e.g. block commit + Ctrl+S, or a commit
 * racing a blur-triggered save) must not emit two save requests: the second
 * call has to re-evaluate the pending changes AFTER the first save settled,
 * otherwise it re-sends already-persisted ops — and the undo entries
 * re-sent from `_cutUndoForSaved` can revert the change the first save
 * just wrote (a freshly added block disappearing immediately).
 */
class CountingAssetChanger extends AssetChanger {
  saveRequests: HistorySaveRequest[][] = [];

  protected override async _saveChangesImpl(
    request: HistorySaveRequest[],
  ): Promise<HistorySaveResponse> {
    this.saveRequests.push(request);
    // Simulate an in-flight IPC so the second saveChanges() call arrives
    // while the first save is still running.
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { originals: [] };
  }
}

function makeChanger(): CountingAssetChanger {
  const changer = new CountingAssetChanger();
  changer.createBlock('asset-1', {
    type: 'prop',
    name: 'newblock',
    title: 'New block',
    index: 1,
    props: {},
  });
  return changer;
}

test('two rapid saveChanges calls emit a single save request', async () => {
  const changer = makeChanger();

  const [first, second] = await Promise.all([
    changer.saveChanges(),
    changer.saveChanges(),
  ]);

  expect(changer.saveRequests.length).toBe(1);
  expect(first).toBe(true);
  expect(second).toBe(false);
});

test('a saveChanges call with nothing pending after a completed save is a no-op', async () => {
  const changer = makeChanger();

  expect(await changer.saveChanges()).toBe(true);
  expect(await changer.saveChanges()).toBe(false);

  expect(changer.saveRequests.length).toBe(1);
});

test('changes registered while a save is in flight are picked up by the next save', async () => {
  const changer = makeChanger();

  const first_save = changer.saveChanges();
  // Register a new change while the first save is still in flight.
  await new Promise((resolve) => setTimeout(resolve, 1));
  changer.changeMainParams('asset-1', { title: 'renamed' });

  const second_save = changer.saveChanges();
  expect(await first_save).toBe(true);
  expect(await second_save).toBe(true);

  expect(changer.saveRequests.length).toBe(2);
});
