export interface MembershipDiff {
  joinedTags: Set<string>;
  leftTags: Set<string>;
}

/**
 * The API only ever gives the current member list, so entries and exits
 * only exist because we compare this poll's list against the last one we
 * recorded as "current" in clan_members.
 */
export function diffMembership(previousTags: ReadonlySet<string>, currentTags: ReadonlySet<string>): MembershipDiff {
  const joinedTags = new Set<string>();
  for (const tag of currentTags) {
    if (!previousTags.has(tag)) {
      joinedTags.add(tag);
    }
  }

  const leftTags = new Set<string>();
  for (const tag of previousTags) {
    if (!currentTags.has(tag)) {
      leftTags.add(tag);
    }
  }

  return { joinedTags, leftTags };
}
