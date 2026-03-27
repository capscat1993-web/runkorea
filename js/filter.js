/* ============================================================
   RunKorea — Filter Logic
   ============================================================ */

const FilterModule = (() => {
  let state = {
    city: '전체',
    difficulty: '전체',
    maxDistance: 20,
    keyword: '',
  };

  function getFiltered() {
    return courses.filter(c => {
      const cityMatch = state.city === '전체' || c.city === state.city;
      const diffMatch = state.difficulty === '전체' || c.difficulty === state.difficulty;
      const distMatch = c.distance <= state.maxDistance;
      const kwMatch =
        state.keyword === '' ||
        c.name.includes(state.keyword) ||
        c.city.includes(state.keyword) ||
        c.description.includes(state.keyword);
      return cityMatch && diffMatch && distMatch && kwMatch;
    });
  }

  function setState(key, value) {
    state[key] = value;
  }

  function getState() {
    return { ...state };
  }

  function reset() {
    state = { city: '전체', difficulty: '전체', maxDistance: 20, keyword: '' };
  }

  return { getFiltered, setState, getState, reset };
})();
