const getRankTitle = (xp = 0) => {
  if (xp <= 50) return 'Side Hustle Rookie';
  if (xp <= 150) return 'Campus Hustler';
  if (xp <= 300) return 'Campus Pro';
  return 'Hustle Legend';
};

module.exports = { getRankTitle };
