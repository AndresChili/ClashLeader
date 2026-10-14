export interface MembershipDiff {
  joinedTags: Set<string>;
  leftTags: Set<string>;
}

/**
 * La API solo da la lista actual de miembros, así que las entradas y
 * salidas existen únicamente porque comparamos la lista de esta consulta
 * con la última que registramos como "current" en clan_members.
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
