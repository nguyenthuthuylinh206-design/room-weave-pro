export type ChangeType = 'new' | 'improved' | 'fixed' | 'removed';

export interface ChangelogChange {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  releaseDate: string;
  title?: string;
  changes: ChangelogChange[];
}
