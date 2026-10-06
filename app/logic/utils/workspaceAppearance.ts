type WorkspacePropsLike = Record<string, unknown> | null | undefined;

function readAppearanceProp(
  props: WorkspacePropsLike,
  key: string,
): string | null {
  const value = props?.[key];
  return typeof value === 'string' && value ? value : null;
}

export function getWorkspaceIconName(props: WorkspacePropsLike): string | null {
  return readAppearanceProp(props, 'icon');
}

export function getWorkspaceColorName(
  props: WorkspacePropsLike,
): string | null {
  return readAppearanceProp(props, 'color');
}

export function getWorkspaceIconClass(
  props: WorkspacePropsLike,
  fallback: string,
): string {
  const icon = getWorkspaceIconName(props);
  return icon ? 'asset-icon-' + icon : fallback;
}
