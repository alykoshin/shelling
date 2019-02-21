
const sanitizeArray = (array, defaultValue) => {
  if (!array) array = defaultValue || [];
  if (!Array.isArray(array)) array = [array];
  return array;
};


module.exports = {
  array: sanitizeArray,
};
