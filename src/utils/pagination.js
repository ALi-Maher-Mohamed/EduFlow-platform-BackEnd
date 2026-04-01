/**
 * Pagination, Filtering, and Sorting utility function
 * Designed to be reusable across multiple endpoints (Courses, Enrollments)
 *
 * @param {Object} model - Mongoose Model
 * @param {Object} reqQuery - req.query object from Express
 * @param {Object} searchFields - Array of fields to perform regex search on (e.g. ['title', 'description'])
 * @param {Object} populateDocs - String or Array of objects to populate related documents
 * @returns {Promise<Object>} Formatted pagination result
 */
const paginateResults = async (
  model,
  reqQuery,
  searchFields = [],
  populateDocs = null,
) => {
  // Creating a copy of req.query
  const queryObj = { ...reqQuery };

  // Fields to exclude from normal filtering
  const excludeFields = ["page", "sort", "limit", "fields", "search"];
  excludeFields.forEach((el) => delete queryObj[el]);

  // Handle advanced filtering (gte, gt, lte, lt)
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  let mongooseQuery = JSON.parse(queryStr);

  // Handle search functionality using regex
  if (reqQuery.search && searchFields.length > 0) {
    const searchRegex = new RegExp(reqQuery.search, "i");
    const searchQuery = searchFields.map((field) => ({ [field]: searchRegex }));
    mongooseQuery = { ...mongooseQuery, $or: searchQuery };
  }

  // Base query
  let query = model.find(mongooseQuery);

  // Sorting
  if (reqQuery.sort) {
    // Convert 'newest', 'popular', rating to actual mongoose sort syntax
    let sortBy;
    switch (reqQuery.sort) {
      case "newest":
        sortBy = "-createdAt";
        break;
      case "popular":
        sortBy = "-totalEnrollments";
        break;
      case "rating":
        sortBy = "-averageRating";
        break;
      default:
        // Support standard mongoose syntax (e.g. sort=price,rating)
        sortBy = reqQuery.sort.split(",").join(" ");
    }
    query = query.sort(sortBy);
  } else {
    // Default sorting (newest first)
    query = query.sort("-createdAt");
  }

  // Selecting Fields
  if (reqQuery.fields) {
    const fields = reqQuery.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    // Exclude mongoose internal version key
    query = query.select("-__v");
  }

  // Pagination Configuration
  const page = parseInt(reqQuery.page, 10) || 1;
  const limit = parseInt(reqQuery.limit, 10) || 10;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // Define populate if passed
  if (populateDocs) {
    query = query.populate(populateDocs);
  }

  // Execute query to get data
  const data = await query;

  // Execute query again to get total count for pagination metadata
  const totalItems = await model.countDocuments(mongooseQuery);
  const totalPages = Math.ceil(totalItems / limit);

  // Construct pagination result object
  return {
    success: true,
    count: data.length,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems,
      limit: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    data,
  };
};

module.exports = paginateResults;
