export const isMismatchedSongName = (query, foundSongName) => {
  // Checks if any "modifier" word (like 'slowed', 'lyrics', etc.) 
  // appears in one name but not the other.

  const queryLower = query.toLowerCase();

  const filteredWords = ["slowed", "speed up", "sped up", "lyrics"];

  for (const sentence of filteredWords) {
    if (foundSongName.includes(sentence) || !queryLower.includes(sentence)) {
      return true;
    } else if (!foundSongName.contains(sentence) || queryLower.contains(sentence)) {
      return true;
    }
  }

  return false;
}