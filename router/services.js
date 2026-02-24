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


/* ================= PRODUCT SCHEMA ================= */
const ProductSchema = new mongoose.Schema({
  itemcode: { type: String, required: true },
  itemid: { type: String },
  itemname: { type: String, required: true },
  qty: { type: String, required: true },
  selling: { type: String, required: true },
  mrp: { type: String, required: true },
  amount: { type: String, required: true },
  discperc: { type: String },
  gstamt: { type: String, required: true },
  discamt: { type: String },
  gstperc: { type: String, required: true },
  netamt: { type: String, required: true },
  itemcategory:{ type: String, required: false },
  itemimg: { type: String, required: false }
});

const ProductModel = mongoose.model('productsdata', ProductSchema);

/* ================= ADD PRODUCT (SINGLE + BULK) ================= */
router.post('/addpro', async (req, res) => {
  try {
    // Always convert request body to array
    const payload = Array.isArray(req.body) ? req.body : [req.body]

    // Remove empty objects (safety)
    const cleanPayload = payload.filter(p => Object.keys(p).length > 0)

    if (cleanPayload.length === 0) {
      return res.status(400).json({ message: 'No product data provided' })
    }

    // Insert single or multiple products
    const products = await ProductModel.insertMany(cleanPayload)

    res.status(201).json({
      message: 'Product(s) Added Successfully',
      count: products.length
    })

  } catch (err) {
    res.status(500).json({
      message: 'Product Not Added',
      error: err
    })
  }
})


/* ================= GET PRODUCTS (GROUP BY CATEGORY) ================= */
router.get('/getproddata', async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const matchStage = {
      $match: {
        $or: [
          { itemname: { $regex: searchQuery, $options: 'i' } },
          { itemcategory: { $regex: searchQuery, $options: 'i' } },
          { itemcode: { $regex: searchQuery, $options: 'i' } }
        ]
      }
    };

    const products = await ProductModel.aggregate([
      matchStage,
      { $sort: { itemcategory: 1 } },   // category order stable
      { $skip: skip },                  // pagination start
      { $limit: limit },                // only 20 docs
      {
        $group: {
          _id: "$itemcategory",
          products: { $push: "$$ROOT" }
        }
      }
    ]);

    res.status(200).json(products);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Products Not Found",
      error: err
    });
  }
});




// Get admin prod data
router.get('/adminproducts', async (req, res) => {
  try {
    const search = (req.query.search || '').trim()

    let query = {}

    if (search) {
      query = {
        $or: [
          { itemname: { $regex: search, $options: 'i' } },
          { itemcategory: { $regex: search, $options: 'i' } }
        ]
      }
    }

    const products = await ProductModel
      .find(query)
      .sort({ itemcategory: 1 })
      .lean()

    const grouped = {}

    products.forEach(prod => {
      if (!grouped[prod.itemcategory]) {
        grouped[prod.itemcategory] = []
      }
      grouped[prod.itemcategory].push(prod)
    })

    const result = Object.keys(grouped).map(cat => ({
      _id: cat,
      products: grouped[cat]
    }))

    res.json(result)

  } catch (err) {
    res.status(500).json({ message: "Error fetching products" })
  }
})


/* ================= UPDATE PRODUCT ================= */
router.put('/updateproddata/:id', async (req, res) => {
  try {
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product Not Found' });
    }

    res.status(200).json({
      message: 'Updated Successfully',
      updatedProduct
    });
  } catch (err) {
    res.status(500).json({ message: 'Update Failed', error: err });
  }
});

/* ================= DELETE PRODUCT ================= */
router.delete('/delete/:id', async (req, res) => {
  try {
    const deletedProduct = await ProductModel.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product Not Found' });
    }

    res.status(200).json({ message: 'Deleted Successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Delete Failed', error: err });
  }
});



/* ================= COUNTER SCHEMA (FOR BILL NUMBER) ================= */
const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('counters', CounterSchema);

/* ================= ORDER SCHEMA ================= */
const OrderSchema = new mongoose.Schema({
  billNumber: { type: Number, required: true, unique: true }, // 🔥 GLOBAL BILL NO

  name: { type: String, required: true },
  mobile: { type: String, required: true },
  address: { type: String, required: true },

  paymentMode: {
    type: String,
    enum: ['cod', 'gpay', 'online'],
    required: true
  },

  paymentId: { type: String, default: '' },
  city: { type: String, required: true },

  items: [
    {
      itemname: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      subtotal: { type: Number, required: true }
    }
  ],

  total: { type: Number, required: true },
  gstTotal: { type: Number, required: true },
  grandTotal: { type: Number, required: true },

  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Pending' },
  deliveredBy: { type: String, default: '' }
});

const Order = mongoose.model('orders', OrderSchema);

/* ================= PLACE ORDER ROUTE ================= */
router.post('/order', async (req, res) => {
  try {
    console.log('Order POST received:', req.body);

    const {
      name,
      mobile,
      address,
      paymentMode,
      paymentId,
      city,
      items,
      total,
      gstTotal,
      grandTotal
    } = req.body;

    /* ================= BASIC VALIDATION ================= */
    if (
      !name ||
      !mobile ||
      !address ||
      !paymentMode ||
      !city ||
      !items ||
      total === undefined ||
      gstTotal === undefined ||
      grandTotal === undefined
    ) {
      return res.status(400).json({
        message:
          'Missing required fields'
      });
    }

    /* ================= PAYMENT VALIDATION ================= */
    if ((paymentMode === 'gpay' || paymentMode === 'online') && !paymentId) {
      return res.status(400).json({
        message: 'paymentId is required for online payments'
      });
    }

    /* ================= ITEMS VALIDATION ================= */
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'items must be a non-empty array'
      });
    }

    /* ================= BILL NUMBER GENERATION (GLOBAL) ================= */
    const counter = await Counter.findOneAndUpdate(
      { name: 'billNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const billNumber = counter.seq; // 🔥 AUTO INCREMENT

    /* ================= SAVE ORDER ================= */
    const newOrder = new Order({
      billNumber,
      name,
      mobile,
      address,
      paymentMode,
      paymentId: paymentId || '',
      city,
      items,
      total,
      gstTotal,
      grandTotal
    });

    const savedOrder = await newOrder.save();

    /* ================= RESPONSE ================= */
    res.status(201).json({
      message: 'Order Placed Successfully!',
      billNumber,          // ✅ FRONTEND + PDF USE
      order: savedOrder
    });

  } catch (error) {
    console.error('Order POST error:', error);
    res.status(500).json({
      message: 'Internal Server Error',
      error
    });
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

// Update Offer (add to router/services.js)
router.put('/updateoffer/:id', async (req, res) => {
  try {
    console.log('PUT /updateoffer/:id - id:', req.params.id, 'body:', req.body);
    const offerId = req.params.id;

    // optional: validate body here

    const updated = await Offer.findByIdAndUpdate(offerId, req.body, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.status(200).json({ message: 'Offer updated', offer: updated });
  } catch (error) {
    console.error('updateoffer error:', error);
    res.status(500).json({ message: 'Update failed', error });
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
