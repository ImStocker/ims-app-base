import type {
  SyncExportSegment,
  SyncExportSegmentCtr,
} from './SyncExportSegment';

export async function getSyncExportSegments(): Promise<
  Map<string, SyncExportSegmentCtr<SyncExportSegment>>
> {
  const [JsonSyncExportSegmentDef, CsvSyncExportSegmentDef] = await Promise.all(
    [
      import('./segments/JsonSyncExportSegment'),
      import('./segments/CsvSyncExportSegment'),
    ],
  );

  const segments: SyncExportSegmentCtr<SyncExportSegment>[] = [
    JsonSyncExportSegmentDef.default,
    CsvSyncExportSegmentDef.default,
  ];
  return new Map(segments.map((ctr) => [ctr.Name, ctr]));
}
