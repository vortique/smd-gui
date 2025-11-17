export const isMismatchedSongName = (query, foundSongName) => {
  // Returns true if modifier words (like 'slowed', 'speed up', etc.) 
  // appear in one name but not the other (indicating a mismatch).

  const queryLower = query.toLowerCase();
  const foundNameLower = foundSongName.toLowerCase();

  const filteredWords = ["slowed", "speed up", "sped up"];

  for (const modifier of filteredWords) {
    const inQuery = queryLower.includes(modifier);
    const inFound = foundNameLower.includes(modifier);

    // If modifier appears in one but not the other, it's a mismatch
    if (inQuery !== inFound) {
      return true;
    }
  }

  return false;
};