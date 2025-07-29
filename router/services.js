const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Signup Schema
const AuthSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  mobilenumber: Number,
  password: String
}, { timestamps: true });

const Authmodel = mongoose.model('authentication', AuthSchema);

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { username, email, mobilenumber, password } = req.body;

    // Check if email is already registered
    const mailFound = await Authmodel.findOne({ email }).exec();
    if (mailFound) {
      return res.status(409).json({ message: 'Email Already Registered' });
    }

    // Hash password
    const hashPassword = await bcrypt.hash(password, 10);

    const user = new Authmodel({ username, email, mobilenumber, password: hashPassword });
    await user.save();
    res.status(200).json({ message: 'Signup Successful' });
  } catch (err) {
    res.status(500).json({ message: 'Error occurred', err });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await Authmodel.findOne({ email }).exec();
    if (!user) {
      return res.status(404).json({ message: 'User Not Found' });
    }

    // Compare passwords
    const checkPassword = await bcrypt.compare(password, user.password);
    if (!checkPassword) {
      return res.status(400).json({ message: 'Incorrect Password' });
    }

    res.status(200).json({ message: 'Login Successful', email: user.email });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', err });
  }
});

// Products Schema
const ProductSchema = new mongoose.Schema({
  pname: String,
  pcategory: String,
  pprice: Number,
  pmrp: Number,
  pquantity: String,
  pimg: String,
});

const ProductModel = mongoose.model('products', ProductSchema);

// Add Products
router.post('/addproduct', async (req, res) => {
  try {
    const { pname, pcategory, pprice, pmrp, pquantity, pimg } = req.body;

    const product = new ProductModel({ pname, pcategory, pprice, pmrp, pquantity, pimg });
    await product.save();
    res.status(200).json({ message: 'Product Added Successfully' });
  } catch (err) {
    res.status(409).json({ message: 'Product Not Added', err });
  }
});

// Get Products based on Categories
router.get('/getproddata', async (req, res) => {
  try {
    const searchQuery = req.query.search || '';

    const products = await ProductModel.aggregate([
      {
        $match: {
          $or: [
            { pname: { $regex: searchQuery, $options: 'i' } },
            { pcategory: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      },
      {
        $group: {
          _id: '$pcategory',
          products: { $push: '$$ROOT' }
        }
      }
    ]);

    res.status(200).json(products);
  } catch (err) {
    res.status(404).json({ message: 'Products Not Found', error: err });
  }
});

// Update Product Data
router.put('/updateproddata/:id', async (req, res) => {
  try {
    const updatedProduct = await ProductModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product Not Found' });
    }
    res.status(200).json({ message: 'Updated Successfully', updatedProduct });
  } catch (err) {
    res.status(500).json({ message: 'Update Failed', err });
  }
});

// Delete Product
router.delete('/delete/:id', async (req, res) => {
  try {
    const deletedProduct = await ProductModel.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product Not Found' });
    }
    res.status(200).json({ message: 'Deleted Successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Delete Failed', err });
  }
});

// Orders Schema
const OrderSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  address: String,
  items: [
    {
      pname: String,
      pprice: Number,
      quantity: Number,
      subtotal: Number
    }
  ],
  total: Number,
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Pending' },
  deliveredBy: { type: String, default: '' }
});

const Order = mongoose.model('orders', OrderSchema);

// Place Order
router.post('/order', async (req, res) => {
  try {
    const { name, mobile, address, items, total } = req.body;

    const newOrder = new Order({
      name,
      mobile,
      address,
      items,
      total
    });

    await newOrder.save();
    res.status(201).json({ message: 'Order Placed Successfully!', order: newOrder });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error });
  }
});

// Get Orders
router.get('/getorders', async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
});

// Delete Order
router.delete('/deleteorder/:id', async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order Not Found' });
    }
    res.status(200).json({ message: 'Order Deleted Successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Delete Failed', err });
  }
});

// Mark Order as Delivered
router.put('/mark-delivered/:id', async (req, res) => {
  try {
    const { deliveredBy } = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'Delivered', deliveredBy },
      { new: true }
    );
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status', error });
  }
});

// Admin Offers Schema
const OfferSchema = new mongoose.Schema({
  offerName: String,
  percentage: Number,
  startDate: Date,
  endDate: Date,
  products: [
    {
      productName: String,
      originalPrice: Number,
      discountPrice: Number,
      image: String,
      quantity: String
    }
  ]
}, { timestamps: true });

const Offer = mongoose.model('offers', OfferSchema);

// Create Offer
router.post('/postoffers', async (req, res) => {
  try {
    const newOffer = new Offer(req.body);
    await newOffer.save();
    res.status(201).json({ message: 'Offer created successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating offer', error });
  }
});

// Get Offers
router.get('/getoffers', async (req, res) => {
  try {
    const offers = await Offer.find();
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offers', error });
  }
});

// Delete Offer
router.delete('/deleteoffer/:id', async (req, res) => {
  try {
    const offerId = req.params.id;
    const deletedOffer = await Offer.findByIdAndDelete(offerId);
    if (!deletedOffer) {
      return res.status(404).json({ message: 'Offer Not Found' });
    }
    res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete offer', error });
  }
});

module.exports = router;
