export function validateTargetEntryName(name: string) {
  if (/[/\\]/.test(name)) {
    throw new Error('Illegal characters in name');
  } else if (!name) {
    throw new Error('Name is empty');
  }
}
