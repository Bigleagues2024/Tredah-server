import mongoose from 'mongoose';

const ProductCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [ true, 'Category name is required' ],
        //unique: [ true, 'Category name must be unique' ]
    },
    slug: {
        type: String,
        required: [ true, 'Category slug is required' ],
        unique: [ true, 'Category slug must be unique' ]
    }, 
},
{ timestamps: true }
)

const ProductCategoryModel = mongoose.model('productCategory', ProductCategorySchema)
export default ProductCategoryModel