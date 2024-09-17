const buildQueryOptions = ({ limit = 10, offset = 0, sortBy = 'createdAt', sortOrder = -1 }) => {
  return {
    sort: { [sortBy]: sortOrder },
    skip: offset,
    limit,
  };
};

export default buildQueryOptions;
