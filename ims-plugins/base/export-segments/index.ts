const segments = [
  {
    name: 'csv',
    controller: async () =>
      (
        await import(
          '#logic/local-fs-sync/segments/CsvSyncExportSegment'
        )
      ).default,
  },
  {
    name: 'json',
    controller: async () =>
      (
        await import(
          '#logic/local-fs-sync/segments/JsonSyncExportSegment'
        )
      ).default,
  },
];

export default function () {
  return segments.map((segment_content) => {
    return {
      type: 'segment',
      content: {
        ...segment_content,
      },
    };
  });
}
