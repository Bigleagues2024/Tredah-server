import { calculateAverageRating, generateUniqueCode, sendResponse } from "../middleware/utils.js"
import NotificationModel from "../models/Notification.js";
import ProductModel from "../models/Product.js";
import ProductCategoryModel from "../models/ProductCategory.js";
import ProductReviewModel from "../models/ProductReview.js";
import SellerKycInfoModel from "../models/SellerKycInfo.js";
import UserModel from "../models/User.js";

export const findOrCreateCategories = async (categories) => {
  if (!Array.isArray(categories)) throw new Error("Categories must be an array");

  return Promise.all(
    categories.map(async (cat) => {
      const categorySlug = cat.toLowerCase().replace(/\s+/g, "-");

      let category = await ProductCategoryModel.findOne({ slug: categorySlug });

      if (!category) {
        category = new ProductCategoryModel({ name: cat, slug: categorySlug });
        await category.save();
      }

      return { _id: category._id.toString(), name: cat };
    })
  );
};

//new product
export async function newProduct(req, res) {
    const { userId, name: userName } = req.user    
    const { name, about, description, category, subCategory, displayPrice, weight, weightValue, moq, variant, quantityInStock, productImageUrl, mediaImagesUrls } = req.body
    
    if(!name) return sendResponse(res, 400, false, null, 'Product name is required')
    if(!description) return sendResponse(res, 400, false, null, 'Product description is required')
    if(!category) return sendResponse(res, 400, false, null, 'Product category is required')
    if(!Array.isArray(category)) return sendResponse(res, 400, false, null,  'Product category must be an array')
    if(category.length < 1) return sendResponse(res, 400, false, null, 'Category array must contain at least one category')
    if (variant) {
        if (!Array.isArray(variant)) {
            sendResponse(res, 400, false, null, 'Variant must be an array')
        }
        const isValid = variant.every(v => typeof v === "object" && v !== null && !Array.isArray(v));
        if (!isValid) {
            sendResponse(res, 400, false, null, 'Each variant must be a valid object')
        }
    }
    if(!productImageUrl) return sendResponse(res, 400, false, null, 'Provide product image link')

    try {
        const categories = await findOrCreateCategories(category)
        let subCategories = []
        if(subCategory) {
            subCategories = await findOrCreateCategories(subCategory)
        }

        const newCode = await generateUniqueCode(9)
        const productId = `TRD${newCode}PR`
        const getSeller = await SellerKycInfoModel.findOne({ accountId: userId })
        const product = await ProductModel.create({
            userId: sellerId,
            productId,
            storeName: getSeller?.companyName || userName,
            name,
            about,
            description,
            category: categories,
            subCategory: subCategories,
            displayPrice,
            weight,
            weightValue,
            moq,
            mainImage: productImageUrl,
            media: mediaImagesUrls,
            variant,
            quantityInStock
        })

        const getUser = await UserModel.findOne({ userId })
        getUser.productCount += 1
        await getUser.save()

        sendResponse(res, 201, true, product, 'New product created successful')
    } catch (error) {
        console.log('UNABLE TO CREATE NEW PRODUCT', error)
        sendResponse(res, 500, false, null, 'Unable to create new product')
    }
}

//edit product
export async function editProduct(req, res) {
    const { userId } = req.user    
    const { productId, name, about, description, category, subCategory, displayPrice, weight, weightValue, moq, variant, quantityInStock, productImageUrl, mediaImagesUrls } = req.body
    
    if(!productId) return sendResponse(res, 400, false, null, 'Product Id is required')
    if(category) {
        if(!Array.isArray(category)) return sendResponse(res, 400, false, null,  'Product category must be an array')
        if(category.length < 1) return sendResponse(res, 400, false, null, 'Category array must contain at least one category')
    }
    if (variant) {
        if (!Array.isArray(variant)) {
            sendResponse(res, 400, false, null, 'Variant must be an array')
        }
        const isValid = variant.every(v => typeof v === "object" && v !== null && !Array.isArray(v));
        if (!isValid) {
            sendResponse(res, 400, false, null, 'Each variant must be a valid object')
        }
    }
    

    try {
        let categories = []
        if(category) {
            categories = await findOrCreateCategories(category)
        }
        let subCategories = []
        if(subCategory) {
            subCategories = await findOrCreateCategories(subCategory)
        }

        const getProduct = await ProductModel.findOne({ productId })
        if(!getProduct) return sendResponse(res, 404, false, null, 'Product with this Id does not exist')
        if(getProduct.sellerId !== userId) return sendResponse(res, 405, false, null, 'Not Allowed')

        if(name) getProduct.name = name
        if(about) getProduct.about = about
        if(description) getProduct.description = description
        if(category) getProduct.category = categories
        if(subCategory) getProduct.subCategory = subCategories
        if(displayPrice) getProduct.displayPrice = displayPrice
        if(weight) getProduct.weight = weight
        if(weightValue) getProduct.weightValue = weightValue
        if(moq) getProduct.moq = moq
        if(productImageUrl) getProduct.mainImage = productImageUrl
        if(mediaImagesUrls) getProduct.media = mediaImagesUrls
        if(variant) getProduct.variant
        if(quantityInStock) getProduct.quantityInStock = quantityInStock

        await getProduct.save()

        sendResponse(res, 201, true, getProduct, 'product Updated successful')
    } catch (error) {
        console.log('UNABLE TO UPDATE PRODUCT', error)
        sendResponse(res, 500, false, null, 'Unable to update product')
    }
}

//get all categories
export async function getCategories(req, res) {

    try {
        const categories = await ProductCategoryModel.find().select('-__v -_id')

        sendResponse(res, 200, true, categories, 'Categories fetched successful')
    } catch {
        console.log('UNABLE TO GET CATEGORIES', error)
        sendResponse(res, 500, false, null, 'Unable to get categories')
    }
}

//get all products (users)
export async function getProducts(req, res) {
  const userId = req?.user?.userId || false
  const {
    limit = 10,
    page = 1,
    search,
    category,
    sellerId,
    storeName,
    oldest,
    latest,
    maxPrice,
    minPrice,
    popular,
    discount,
  } = req.query;

  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  const skip = (parsedPage - 1) * parsedLimit;

  let baseQuery = { active: true, blocked: false, inStock: true };

  // Filter by discount
  //if (discount === 'true') {
  //  baseQuery.discountAllowed = true;
  //}

  // Price filtering
  if (minPrice && maxPrice) {
    baseQuery.displayPrice = { $gte: Number(minPrice), $lte: Number(maxPrice) };
  } else if (minPrice) {
    baseQuery.displayPrice = { $gte: Number(minPrice) };
  } else if (maxPrice) {
    baseQuery.displayPrice = { $lte: Number(maxPrice) };
  }

  // Seller/store filters
  if (sellerId) baseQuery.sellerId = sellerId;
  if (storeName) baseQuery.storeName = storeName;

  // Category filter
  if (category) {
    const categoryRegex = new RegExp(category, 'i');
    baseQuery.$or = [
        { 'category.name': categoryRegex },
        { 'subCategory.name': categoryRegex },
    ]
  }

  // Priority search
  if (search) {
    const regex = new RegExp(search, 'i');
    baseQuery.$or = [
      { name: regex },
      { storeName: regex },
      { productId: regex },
      { 'category.name': regex },
      { 'subCategory.name': regex }
    ];
  }

  let products = [];
  let total = 0;
  let sortType = '';

  try {
    if (popular) {
      products = await ProductModel.find(baseQuery)
        .sort({ likes: -1 }) // Array field, sort by number of likes
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'popular';
    } else if (oldest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'oldest';
    } else if (latest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'latest';
    } else {
        // Mixed: fetch distinct oldest and latest without duplication
        const halfLimit = Math.ceil(parsedLimit / 2);
        
        const [oldProducts, newProducts] = await Promise.all([
            ProductModel.find(baseQuery)
            .sort({ createdAt: 1 })
            .limit(halfLimit),
            ProductModel.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(parsedLimit),
        ]);

        // Combine and remove duplicates by productId
        const productMap = new Map();
        [...oldProducts, ...newProducts].forEach((product) => {
            productMap.set(product.productId, product);
        });

        products = Array.from(productMap.values()).slice(skip, skip + parsedLimit);
        sortType = 'mixed';
    }

    total = await ProductModel.countDocuments(baseQuery);

    //build products here
    const simplifiedProducts = await Promise.all(products.map(async (product) => {
        const productId = product.productId
        const productReview = await ProductReviewModel.findOne({ productId })
        const reviews = productReview?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        return {
            productId: product.productId,
            name: product.name,
            image: product.mainImage, 
            imageArray: product.imageArray, 
            price: product.price,
            storeName: product.storeName,
            sellerId: product.sellerId,
            discount: product.discountAllowed ? product.discount : null,
            discountPercentage: product.discountPercentage ? product.discountPercentage : null,
            discountedPrice: product.discountedPrice ? product.discountedPrice : null,
            likes: product.likes?.length || 0,
            liked: userId ? product.likes.includes(userId) : false,
            rating,
            totalReviews
        }
    }))

    // ✅ Build final response payload
    const responsePayload = {
      data: simplifiedProducts,
      totalCount: total,
      currentPage: parsedPage,
      totalpages: Math.ceil(total / parsedLimit),
      sortType,
    };

    sendResponse(res, 200, true, responsePayload, `Products fetched`);
  } catch (error) {
    console.log('UNABLE TO GET PRODUCTS FOR USERS', error);
    sendResponse(res, 500, false, null, 'Unable to get products for users');
  }
}

//get product of a store owner (users)
export async function getStoreProducts(req, res) {
  const { userId } = req.user || {}
  const {
    limit = 10,
    page = 1,
    search,
    category,
    storeName,
    oldest,
    latest,
    maxPrice,
    minPrice,
    popular,
    discount
  } = req.query;

  const { sellerId } = req.params;
  if (!sellerId) return sendResponse(res, 400, false, null, 'Seller ID is required');

  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  const skip = (parsedPage - 1) * parsedLimit;

  let baseQuery = { sellerId, active: true, blocked: false, inStock: true };

  // Filter by discount
  //if (discount === 'true') {
  //  baseQuery.discountAllowed = true;
  //}

  // Filter by price range
  if (minPrice && maxPrice) {
    baseQuery.displayPrice = { $gte: Number(minPrice), $lte: Number(maxPrice) };
  } else if (minPrice) {
    baseQuery.displayPrice = { $gte: Number(minPrice) };
  } else if (maxPrice) {
    baseQuery.displayPrice = { $lte: Number(maxPrice) };
  }

  // Filter by store name
  if (storeName) baseQuery.storeName = storeName;

  // Filter by category (regex)
  if (category) {
    const categoryRegex = new RegExp(category, 'i');
    baseQuery.$or = [
        { 'category.name': categoryRegex },
        { 'subCategory.name': categoryRegex },
    ]
  }

  // Priority-based search
  if (search) {
    const regex = new RegExp(search, 'i');
    baseQuery.$or = [
      { name: regex },
      { storeName: regex },
      { productId: regex },
      { 'category.name': regex }
    ];
  }

  let products = [];
  let total = 0;
  let sortType = '';

  try {
    if (popular) {
      products = await ProductModel.find(baseQuery)
        .sort({ likes: -1 }) // likes is an array
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'popular';
    } else if (oldest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'oldest';
    } else if (latest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'latest';
    } else {
        // Mixed: fetch distinct oldest and latest without duplication
        const halfLimit = Math.ceil(parsedLimit / 2);
        
        const [oldProducts, newProducts] = await Promise.all([
            ProductModel.find(baseQuery)
            .sort({ createdAt: 1 })
            .limit(halfLimit),
            ProductModel.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(parsedLimit),
        ]);

        // Combine and remove duplicates by productId
        const productMap = new Map();
        [...oldProducts, ...newProducts].forEach((product) => {
            productMap.set(product.productId, product);
        });

        products = Array.from(productMap.values()).slice(skip, skip + parsedLimit);
        sortType = 'mixed';
    }

    total = await ProductModel.countDocuments(baseQuery);

    // Simplify product objects for response
    const simplifiedProducts = await Promise.all(products.map(async (product) => {
        const productId = product.productId
        const productReview = await ProductReviewModel.findOne({ productId })
        const reviews = productReview?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        return {
            productId: product.productId,
            name: product.name,
            image: product.mainImage,
            imageArray: product.imageArray,
            price: product.price,
            storeName: product.storeName,
            sellerId: product.sellerId,
            discount: product.discountAllowed ? product.discount : null,
            discountPercentage: product.discountPercentage || null,
            discountedPrice: product.discountedPrice || null,
            likes: product.likes?.length || 0,
            liked: userId ? product.likes.includes(userId) : false,
            rating,
            totalReviews
        }
    }))

    const responsePayload = {
      data: simplifiedProducts,
      totalCount: total,
      currentPage: parsedPage,
      totalpages: Math.ceil(total / parsedLimit),
      sortType,
    };

    sendResponse(res, 200, true, responsePayload, `Products fetched`);
  } catch (error) {
    console.log('UNABLE TO GET STORE PRODUCTS', error);
    sendResponse(res, 500, null, false, 'Unable to get store products');
  }
}

//get a product (users)
export async function getProduct(req, res) {
    const { productId } = req.params;
    if (!productId) return sendResponse(res, 400, false, null, 'Product Id is required');

    try {
        const getProduct = await ProductModel.findOne({ productId })
            .select('-__v -_id -blockedReason -revenueGenerated');
        if (!getProduct) return sendResponse(res, 404, false, 'Product not found');
        if (getProduct.blocked) return sendResponse(res, 403, false, null, 'Product not available');
        if (!getProduct.active) return sendResponse(res, 403, false, null, 'Product not available');

        const productReview = await ProductReviewModel.findOne({ productId });
        const reviews = productReview?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        const { active, blocked, ...productData } = getProduct._doc
        //const productData = getProduct.toObject();
        const modifiedData = {
            ...productData,
            rating,
            totalReviews
        };

        sendResponse(res, 200, true, modifiedData, 'Product fetched successfully');
    } catch (error) {
        console.log('UNABLE TO GET PRODUCT FOR USERS', error);
        sendResponse(res, 500, false, null, 'Unable to get product details for user');
    }
}

//get related product
export async function getRelatedProduct(req, res) {
  const { productId } = req.params;
  const { limit = 10, page = 1 } = req.query;
  const parsedLimit = parseInt(limit);
  const parsedPage = parseInt(page);
  const skip = (parsedPage - 1) * parsedLimit;
  const userId = req.user?.userId;

  if (!productId) return sendResponse(res, 400, false, null, 'Product Id is required');

  try {
    const getProduct = await ProductModel.findOne({ productId })
      .select('-__v -_id -blockedReason -revenueGenerated -active -blocked');

    if (!getProduct) return sendResponse(res, 404, false, null, 'Product not found');
    if (getProduct.blocked || !getProduct.active)
      return sendResponse(res, 403, false, null, 'Product not available');

    const { sellerId, categories = [] } = getProduct;

    // Extract category _id values
    const categoryIds = categories.map(cat => cat._id);

    // --- Fetch related sets ---
    // 1. Products by same seller
    const sellerProducts = await ProductModel.find({
      productId: { $ne: productId },
      active: true,
      inStock: true,
      blocked: false,
      sellerId,
    }).sort({ updatedAt: -1 });

    // 2. Products by same category (exclude seller duplicates)
    const categoryProducts = await ProductModel.find({
      productId: { $ne: productId },
      active: true,
      inStock: true,
      blocked: false,
      'categories._id': { $in: categoryIds },
      sellerId: { $ne: sellerId },
    }).sort({ updatedAt: -1 });

    // --- Merge into 50/50 ratio ---
    const halfLimit = Math.ceil(parsedLimit / 2);
    const mergedProducts = [
      ...sellerProducts.slice(0, halfLimit),
      ...categoryProducts.slice(0, halfLimit),
    ];

    // Deduplicate by productId
    const uniqueProducts = Array.from(
      new Map(mergedProducts.map(p => [p.productId, p])).values()
    );

    // Sort globally (seller priority then most recent)
    const globallySorted = uniqueProducts.sort((a, b) => {
      if (a.sellerId === sellerId && b.sellerId !== sellerId) return -1;
      if (b.sellerId === sellerId && a.sellerId !== sellerId) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    // Global pagination
    const paginatedProducts = globallySorted.slice(skip, skip + parsedLimit);

    // Count totals for pagination metadata
    const totalSeller = sellerProducts.length;
    const totalCategory = categoryProducts.length;
    const total = totalSeller + totalCategory;

    // Build simplified product list
    const simplifiedProducts = await Promise.all(
      paginatedProducts.map(async (product) => {
        const productReview = await ProductReviewModel.findOne({ productId: product.productId });
        const reviews = productReview?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        return {
          productId: product.productId,
          name: product.name,
          image: product.mainImage,
          imageArray: product.imageArray,
          price: product.price,
          storeName: product.storeName,
          sellerId: product.sellerId,
          discount: product.discountAllowed ? product.discount : null,
          discountPercentage: product.discountPercentage || null,
          discountedPrice: product.discountedPrice || null,
          likes: product.likes?.length || 0,
          liked: userId ? product.likes.includes(userId) : false,
          rating,
          totalReviews,
        };
      })
    );

    // Send response
    const responsePayload = {
      data: simplifiedProducts,
      totalCount: total,
      currentPage: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
      sortType: 'related',
    };

    sendResponse(res, 200, true, responsePayload, 'Product fetched successfully');
  } catch (error) {
    console.log('UNABLE TO GET RELATED PRODUCT FOR USERS', error);
    sendResponse(res, 500, false, null, 'Unable to get related product details for user');
  }
}

//get all products (admin)
export async function getAllProducts(req, res) {
  const {
    limit = 10,
    page = 1,
    search,
    category,
    sellerId,
    storeName,
    oldest,
    latest,
    maxPrice,
    minPrice,
    popular,
    discount,
    active,
    blocked,
  } = req.query;

  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  const skip = (parsedPage - 1) * parsedLimit;

  let baseQuery = {};

  // Filter by active status
  if (typeof active === 'boolean') {
    baseQuery.active = active;
  }

  // Filter by blocked status
  if (typeof blocked === 'boolean') {
    baseQuery.blocked = blocked;
  }

  // Filter by discount
  //if (typeof discount === 'boolean' && discount) {
  //  baseQuery.discountAllowed = true;
  //}

  // Price filtering
  if (minPrice && maxPrice) {
    baseQuery.displayPrice = { $gte: Number(minPrice), $lte: Number(maxPrice) };
  } else if (minPrice) {
    baseQuery.displayPrice = { $gte: Number(minPrice) };
  } else if (maxPrice) {
    baseQuery.displayPrice = { $lte: Number(maxPrice) };
  }

  // Seller and store filters
  if (sellerId) baseQuery.sellerId = sellerId;
  if (storeName) baseQuery.storeName = storeName;

  // Category filter (regex)
  if (category) {
    const categoryRegex = new RegExp(category, 'i');
    baseQuery.$or = [
        { 'category.name': categoryRegex },
        { 'subCategory.name': categoryRegex },
    ]
  }

  // Priority search
  if (search) {
    const regex = new RegExp(search, 'i');
    baseQuery.$or = [
      { name: regex },
      { storeName: regex },
      { productId: regex },
      { 'category.name': regex },
    ];
  }

  try {
    let products = [];
    let total = 0;
    let sortType = '';

    if (popular) {
      products = await ProductModel.find(baseQuery)
        .sort({ likes: -1 }) // sort by likes count descending
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'popular';
    } else if (oldest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'oldest';
    } else if (latest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'latest';
    } else {
        // Mixed: fetch distinct oldest and latest without duplication
        const halfLimit = Math.ceil(parsedLimit / 2);
        
        const [oldProducts, newProducts] = await Promise.all([
            ProductModel.find(baseQuery)
            .sort({ createdAt: 1 })
            .limit(halfLimit),
            ProductModel.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(parsedLimit),
        ]);

        // Combine and remove duplicates by productId
        const productMap = new Map();
        [...oldProducts, ...newProducts].forEach((product) => {
            productMap.set(product.productId, product);
        });

        products = Array.from(productMap.values()).slice(skip, skip + parsedLimit);
        sortType = 'mixed';
    }

    total = await ProductModel.countDocuments(baseQuery);

    const simplifiedProducts = await Promise.all(products.map(async (product) => {
        const productId = product.productId
        const productReview = await ProductReviewModel.findOne({ productId })
        const reviews = productReview?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        return {
            productId: product.productId,
            name: product.name,
            image: product.mainImage,
            imageArray: product.imageArray,
            price: product.price,
            storeName: product.storeName,
            sellerId: product.sellerId,
            discount: product.discountAllowed ? product.discount : null,
            discountPercentage: product.discountPercentage || null,
            discountedPrice: product.discountedPrice || null,
            likes: product.likes?.length || 0,
            createdAt: product?.createdAt,
            rating,
            totalReviews
        }
    }))

    // ✅ Build final response payload
    const responsePayload = {
      data: simplifiedProducts,
      totalCount: total,
      currentPage: parsedPage,
      totalpages: Math.ceil(total / parsedLimit),
      sortType,
    };

    sendResponse(
      res,
      200,
      true,
      responsePayload,
      `Products fetched`
    );
  } catch (error) {
    console.error('UNABLE TO GET PRODUCTS FOR ADMIN', error);
    sendResponse(res, 500, false, null, 'Unable to get products for admin');
  }
}

//get product of a store owner (admin and owner)
export async function getSellerProducts(req, res) {
    const { userId, adminId } = req.user
  const {
    limit = 10,
    page = 1,
    search,
    category,
    storeName,
    oldest,
    latest,
    maxPrice,
    minPrice,
    popular,
    discount,
    active,
    blocked,
  } = req.query;

  const { sellerId: accountId } = req.params || {};
  const sellerId = accountId || userId
  if (!sellerId) return sendResponse(res, 400, false, null, 'Seller ID is required');

  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  const skip = (parsedPage - 1) * parsedLimit;

  let baseQuery = { sellerId };

  // Filter by active status
  if (typeof active === 'boolean') {
    baseQuery.active = active;
  }

  // Filter by blocked status
  if (typeof blocked === 'boolean') {
    baseQuery.blocked = blocked;
  }

  // Filter by discount
  if (discount === 'true') {
    baseQuery.discountAllowed = true;
  }

  // Filter by price range
  if (minPrice && maxPrice) {
    baseQuery.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
  } else if (minPrice) {
    baseQuery.price = { $gte: Number(minPrice) };
  } else if (maxPrice) {
    baseQuery.price = { $lte: Number(maxPrice) };
  }

  // Filter by store name
  if (storeName) baseQuery.storeName = storeName;

  // Filter by category (regex)
  if (category) {
    const categoryRegex = new RegExp(category, 'i');
    baseQuery.$or = [
        { 'category.name': categoryRegex },
        { 'subCategory.name': categoryRegex }
    ]
  }

  // Priority-based search
  if (search) {
    const regex = new RegExp(search, 'i');
    baseQuery.$or = [
      { name: regex },
      { storeName: regex },
      { productId: regex },
      { 'category.name': regex }
    ];
  }

  let products = [];
  let total = 0;
  let sortType = '';

  try {
    if (popular) {
      products = await ProductModel.find(baseQuery)
        .sort({ likes: -1 }) // likes is an array
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'popular';
    } else if (oldest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'oldest';
    } else if (latest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'latest';
    } else {
        // Mixed: fetch distinct oldest and latest without duplication
        const halfLimit = Math.ceil(parsedLimit / 2);
        
        const [oldProducts, newProducts] = await Promise.all([
            ProductModel.find(baseQuery)
            .sort({ createdAt: 1 })
            .limit(halfLimit),
            ProductModel.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(parsedLimit),
        ]);

        // Combine and remove duplicates by productId
        const productMap = new Map();
        [...oldProducts, ...newProducts].forEach((product) => {
            productMap.set(product.productId, product);
        });

        products = Array.from(productMap.values()).slice(skip, skip + parsedLimit);
        sortType = 'mixed';
    }

    total = await ProductModel.countDocuments(baseQuery);

    const simplifiedProducts = await Promise.all(products.map(async (product) => {
        const productId = product.productId
        const productReview = await ProductReviewModel.findOne({ productId })
        const reviews = productReview?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        return {
            productId: product.productId,
            name: product.name,
            image: product.mainImage,
            imageArray: product.imageArray,
            price: product.price,
            storeName: product.storeName,
            sellerId: product.sellerId,
            discount: product.discountAllowed ? product.discount : null,
            discountPercentage: product.discountPercentage || null,
            discountedPrice: product.discountedPrice || null,
            likes: product.likes?.length || 0,
            rating,
            totalReviews
        }
    }))

    // ✅ Build final response payload
    const responsePayload = {
      data: simplifiedProducts,
      totalCount: total,
      currentPage: parsedPage,
      totalpages: Math.ceil(total / parsedLimit),
      sortType,
    };

    sendResponse(res, 200, true, responsePayload, `Products fetched (${sortType})`);
  } catch (error) {
    console.log('UNABLE TO GET STORE PRODUCTS OF SELLER', error);
    sendResponse(res, 500, false, null, 'Unable to get store products of seller');
  }
}

//get a product (admin and owner)
export async function getAProduct(req, res) {
    const { adminId, userId } = req.user
    const { productId } = req.params
    if(!productId) return sendResponse(res, 400, false, null, 'Product Id is required')

        try {
        const getProduct = await ProductModel.findOne({ productId }).select('-__v -_id')
        if(!getProduct) return sendResponse(res, 404, false, 'Product not found')
        if(!adminId && userId !== getProduct.sellerId) return sendResponse(res, 405, false, null, 'Not allowed')
        
        //rating
        const productReview = await ProductReviewModel.findOne({ productId })
        const reviews = productReview?.reviews || [];
        const rating = calculateAverageRating(reviews);
        const totalReviews = reviews.length;

        const productData = getProduct.toObject()
        const modifiedData = {
            ...productData,
            rating,
            totalReviews
        }
        sendResponse(res, 200, true, modifiedData, 'Product fetched successfully')
    } catch (error) {
        console.log(`UNABLE TO GET PRODUCT FOR ${adminId ? 'ADMIN' : 'SELLER'}`, error)
        sendResponse(res, 500, false, null, 'Unable to get product details')
    }
}

//block product (admin)
export async function blockProduct(req, res) {
    const { productId, blockedReason } = req.body
    if(!productId) return sendResponse(res, 400, false, null, 'Product Id is required')
    
    try {
        const getProduct = await ProductModel.findOne({ productId })
        if(!getProduct) return sendResponse(res, 404, false, null, 'Product does not exist')       
        
        getProduct.blocked = true
        getProduct.active = false
        getProduct.blockedReason = blockedReason || ''
        await getProduct.save()

        //notify product owner
        await NotificationModel.create({
            userId: getProduct.sellerId,
            notification: `Product ${getProduct?.name} with ID: ${productId} has beeen blocked by admin. For further assitance conatct admin`
        })

        const { __v, _id, ...productData } = getProduct._doc
        sendResponse(res, 200, true, productData, 'Product Blocked')
    } catch (error) {
        console.log('UNABLE TO BLOCK PRODUCT', error)
        sendResponse(res, 500, false, null, 'Unable to block product')
    }
}

//unblock product (admin)
export async function unBlockProduct(req, res) {
    const { productId } = req.body
    if(!productId) return sendResponse(res, 400, false, null, 'Product Id is required')
    
    try {
        const getProduct = await ProductModel.findOne({ productId })
        if(!getProduct) return sendResponse(res, 404, false, null, 'Product does not exist')       
        
        getProduct.blocked = false
        getProduct.active = true
        getProduct.blockedReason = ''
        await getProduct.save()

        //notify product owner
        await NotificationModel.create({
            userId: getProduct.userId,
            notification: `Product ${getProduct?.name} with ID: ${productId} has beeen unblocked by admin.`
        })

        const { __v, _id, ...productData } = getProduct._doc
        sendResponse(res, 200, true, productData, 'Product Blocked')
    } catch (error) {
        console.log('UNABLE TO UNBLOCK PRODUCT', error)
        sendResponse(res, 500, false, null, 'Unable to unblock product')
    }
}

//delete product (owner)
export async function deleteProduct(req, res) {
    const { userId } = req.user
    const { productId } = req.body
    if(!productId) return sendResponse(res, 400, false, null, 'Product Id is required')

    try {
        const getProduct = await ProductModel.findOne({ productId })
        if(!getProduct) return sendResponse(res, 400, false, null, 'Product does not exist')
        if(getProduct.sellerId !== userId) return sendResponse(res, 405, false, null, 'Not Allowed')

        if(getProduct.noOfSales > 0){
            getProduct.active = false
            await getProduct.save()

            sendResponse(res, 200, true, null, 'Product has at least one sale. Product deactivated instead')
            return
        }

        await ProductModel.deleteOne({ productId })
        sendResponse(res, 200, true, null, 'Product deleted')
    } catch (error) {
        console.log('UNABLE TO DELETE PRODUCT', error)
        sendResponse(res, 500, false, null, 'Unable to delete product')
    }
}

//deactivate product (owner of product)
export async function deActivateProduct(req, res) {
    const { userId } = req.user
    const { productId } = req.body
    if(!productId) return sendResponse(res, 400, false, null, 'Product Id is required')
    
    try {
        const getProduct = await ProductModel.findOne({ productId })
        if(!getProduct) return sendResponse(res, 404, false, null, 'Product does not exist')       
        if(userId !== getProduct.sellerId) return sendResponse(res, 405, false, null, 'Not allowed')
        
        getProduct.active = false
        await getProduct.save()

        //notify product owner
        await NotificationModel.create({
            userId: getProduct.userId,
            notification: `Product with ID: ${productId} has beeen deActivated.`
        })

        const { __v, _id, ...productData } = getProduct._doc
        sendResponse(res, 200, true, productData, 'Product Deactivated')
    } catch (error) {
        console.log('UNABLE TO DEACTIVATE PRODUCT', error)
        sendResponse(res, 500, false, null, 'Unable to deactivate product')
    }
}

//active product (owner of product)
export async function activateProduct(req, res) {
    const { userId } = req.user
    const { productId } = req.body
    if(!productId) return sendResponse(res, 400, false, null, 'Product Id is required')
    
    try {
        const getProduct = await ProductModel.findOne({ productId })
        if(!getProduct) return sendResponse(res, 404, false, null, 'Product does not exist')   
        if(userId !== getProduct.sellerId) return sendResponse(res, 405, false, null, 'Not allowed')

        
        getProduct.active = true
        await getProduct.save()

        //notify product owner
        await NotificationModel.create({
            userId: getProduct.userId,
            notification: `Product with ID: ${productId} has beeen activated.`
        })

        const { __v, _id, ...productData } = getProduct._doc
        sendResponse(res, 200, true, productData, 'Product Activated')
    } catch (error) {
        console.log('UNABLE TO ACTIVATE PRODUCT', error)
        sendResponse(res, 500, false, null, 'Unable to activate product')
    }
}

//rate a product (star rating (users))
export async function rateProduct(req, res) {
    const { userId, name, profileImg } = req.user;
    const { productId, rating, review } = req.body;

    if (!productId) return sendResponse(res, 400, false, null,'Product Id is required');
    if (!rating && !review) return sendResponse(res, 400, false, null, 'Either Review, rating or both is required');
    
    if (rating) {
        if (isNaN(rating)) return sendResponse(res, 400, false, null, 'Rating must be a number');
        if (rating < 1 || rating > 5) return sendResponse(res, 400, false, null, 'Rating must be between 1 and 5');
    }

    if (review && typeof review !== 'string') return sendResponse(res, 400, false, null, 'Review must be a string');

    try {
        let productReview = await ProductReviewModel.findOne({ productId });

        const data = { userId, review, rating, name, profileImg, date: Date.now() };

        if (productReview) {
            const existingIndex = productReview.reviews.findIndex(r => r.userId.toString() === userId.toString());

            if (existingIndex !== -1) {
                // Update existing review
                if (rating !== undefined) productReview.reviews[existingIndex].rating = rating;
                if (review !== undefined) productReview.reviews[existingIndex].review = review;
            } else {
                // Add new review
                productReview.reviews.push(data);
            }

            await productReview.save();
        } else {
            await ProductReviewModel.create({
                productId,
                reviews: [data]
            });
        }

        sendResponse(res, 200, true, null, 'Rating saved successfully');
    } catch (error) {
        console.log('UNABLE TO RATE PRODUCT', error);
        sendResponse(res, 500, false, null, 'Unable to rate product');
    }
}

//get a review for a product (public)
export async function getProductReview(req, res) {
    const { productId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    try {
        const reviews = await ProductReviewModel.find({ productId })
            .skip(skip)
            .limit(parsedLimit)
            .sort({ createdAt: -1 }); // optional: latest first

        const totalReviews = reviews[0]?.reviews?.length

        if (!reviews || reviews.length === 0) {
            return sendResponse(res, 404, false, null, 'No product reviews found');
        }

        sendResponse(res, 200, true, {
            data: reviews[0]?.reviews,
            totalReviews,
            currentPage: parsedPage,
            totalPages: Math.ceil(totalReviews / parsedLimit),
        }, 'Product reviews retrieved successfully');
    } catch (error) {
        console.error('UNABLE TO GET PRODUCT REVIEWS:', error);
        sendResponse(res, 500, false, null, 'Unable to get product reviews');
    }
}

//like a product 
export async function likeProduct(req, res) {
    const { userId } = req.user;
    const { productId } = req.body;

    try {
        const getProduct = await ProductModel.findOne({ productId });
        if (!getProduct) return sendResponse(res, 400, false, null, 'Product not found');
        const getUser = await UserModel.findOne({ userId });

        const alreadyLiked = getProduct.likes.includes(userId);
        if (alreadyLiked) {
            return sendResponse(res, 400, false, null, 'Like saved');
        }

        getProduct.likes.push(userId);
        await getProduct.save();

        getUser.savedProducts.push(productId)
        await getUser.save()

        sendResponse(res, 200, true, null, 'Like saved');
    } catch (error) {
        console.log('UNABLE TO LIKE PRODUCT', error);
        sendResponse(res, 500, false, null, 'Unable to like product');
    }
}

//unlike a product
export async function unlikeProduct(req, res) {
  const { userId } = req.user;
  const { productId } = req.body;

  try {
    const getProduct = await ProductModel.findOne({ productId });
    if (!getProduct) return sendResponse(res, 400, false, null, 'Product not found');
    const getUser = await UserModel.findOne({ userId });

    // Remove the userId from the likes array
    getProduct.likes = getProduct.likes.filter(id => id !== userId);
    await getProduct.save();

    // Remove the productId from the savedProducts array
    getUser.likes = getUser.likes.filter(id => id !== productId);
    await getUser.save();

    sendResponse(res, 200, true, null,  'Like removed');
  } catch (error) {
    console.log('UNABLE TO UNLIKE PRODUCT', error);
    sendResponse(res, 500, false, null, 'Unable to unlike product');
  }
}

//get saved product
export async function getSavedProduct(req, res) {
  const userId = req?.user?.userId || false;
  const savedProducts = req?.user?.savedProducts || [];

  const {
    limit = 10,
    page = 1,
    search,
    category,
    sellerId,
    storeName,
    oldest,
    latest,
    maxPrice,
    minPrice,
    popular,
    discount,
  } = req.query;

  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  const skip = (parsedPage - 1) * parsedLimit;

  // Only fetch user's saved products
  let baseQuery = { 
    active: true, 
    blocked: false, 
    inStock: true,
    productId: { $in: savedProducts }   // ✅ restrict to saved products
  };

  // Price filtering
  if (minPrice && maxPrice) {
    baseQuery.displayPrice = { $gte: Number(minPrice), $lte: Number(maxPrice) };
  } else if (minPrice) {
    baseQuery.displayPrice = { $gte: Number(minPrice) };
  } else if (maxPrice) {
    baseQuery.displayPrice = { $lte: Number(maxPrice) };
  }

  // Seller/store filters
  if (sellerId) baseQuery.sellerId = sellerId;
  if (storeName) baseQuery.storeName = storeName;

  // Category filter
  if (category) {
    const categoryRegex = new RegExp(category, 'i');
    baseQuery.$or = [
      { 'category.name': categoryRegex },
      { 'subCategory.name': categoryRegex },
    ];
  }

  // Search filter
  if (search) {
    const regex = new RegExp(search, 'i');
    baseQuery.$or = [
      { name: regex },
      { storeName: regex },
      { productId: regex },
      { 'category.name': regex },
      { 'subCategory.name': regex }
    ];
  }

  let products = [];
  let total = 0;
  let sortType = '';

  try {
    if (popular) {
      products = await ProductModel.find(baseQuery)
        .sort({ likes: -1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'popular';
    } else if (oldest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'oldest';
    } else if (latest) {
      products = await ProductModel.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);
      sortType = 'latest';
    } else {
      // Mixed: oldest + latest combined
      const halfLimit = Math.ceil(parsedLimit / 2);
      const [oldProducts, newProducts] = await Promise.all([
        ProductModel.find(baseQuery).sort({ createdAt: 1 }).limit(halfLimit),
        ProductModel.find(baseQuery).sort({ createdAt: -1 }).limit(parsedLimit),
      ]);

      const productMap = new Map();
      [...oldProducts, ...newProducts].forEach((product) => {
        productMap.set(product.productId, product);
      });

      products = Array.from(productMap.values()).slice(skip, skip + parsedLimit);
      sortType = 'mixed';
    }

    total = await ProductModel.countDocuments(baseQuery);

    // Build simplified product list
    const simplifiedProducts = await Promise.all(products.map(async (product) => {
      const productId = product.productId;
      const productReview = await ProductReviewModel.findOne({ productId });
      const reviews = productReview?.reviews || [];
      const rating = calculateAverageRating(reviews);
      const totalReviews = reviews.length;

      return {
        productId: product.productId,
        name: product.name,
        image: product.mainImage,
        imageArray: product.imageArray,
        price: product.price,
        storeName: product.storeName,
        sellerId: product.sellerId,
        discount: product.discountAllowed ? product.discount : null,
        discountPercentage: product.discountPercentage || null,
        discountedPrice: product.discountedPrice || null,
        likes: product.likes?.length || 0,
        liked: userId ? product.likes.includes(userId) : false,
        rating,
        totalReviews,
      };
    }));

    // Final response
    const responsePayload = {
      data: simplifiedProducts,
      totalCount: total,
      currentPage: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
      sortType,
    };

    sendResponse(res, 200, true, responsePayload, `Saved products fetched`);
  } catch (error) {
    console.log('UNABLE TO GET SAVED PRODUCTS', error);
    sendResponse(res, 500, false, null, 'Unable to get saved products');
  }
}
