var express=require('express')
const router = express.Router();
const mongoose=require('mongoose')
const bcrypt=require('bcryptjs')



                        // Signup

// Signup Schema

const AuthSchema=new mongoose.Schema({
    username:String,
    email:{type:String , unique:true},
    mobilenumber:Number,
    password:String
},{timestamps:true})

const Authmodel = mongoose.model('authentication',AuthSchema)

// Signup Route


router.post('/signup',async (req,res)=>{

    try{
        const{username,email,mobilenumber,password}=req.body

        const mailFound=await Authmodel.findOne({email})
            if(mailFound){
                return res.status(409).json({message:'Email Already Registered'})
            }
    
        const hashPassword=await bcrypt.hash(password,10)
        
        let user=new Authmodel({
            username,email,mobilenumber,password:hashPassword
        })
    
        await user.save()
        .then(resp=>res.status(200).json({message:"Signup Successful"}))
        .catch(err=>res.status(500).json({message:"Signup failed",err}))
    }
    catch(err){
        res.status(500).json({message:"Error,err"})
    }

})


                            //Login

// Login Route

router.post('/login',async(req,res)=>{

    try{
        const{email,password}=req.body

        const user=await Authmodel.findOne({email})

        if(!user){
            return res.status(404).json({message:"User Not Found"})
        }

        const checkPassword=await bcrypt.compare(password,user.password)

        if(!checkPassword){
            return res.status(404).json({message:"Password Incorrect"})
        }
        else{
              res.status(200).json({message:"Login Successful",email:user.email})
        }
    }
    catch(err){
        return res.status(500).json({message:"Server Error",err})
    }

})





//Products

// Products Schema

const ProductSchema=new mongoose.Schema({
    pname:String,
    pcategory:String,
    pprice:Number,
    pmrp:Number,
    pquantity:String,
    pimg:String,
})

//Add Products

const ProductModel=mongoose.model('products',ProductSchema)

router.post('/addproduct',async(req,res)=>{
    const{pname,pcategory,pprice,pmrp,pquantity,pimg}=req.body

    let Products=new ProductModel({
        pname,pcategory,pprice,pmrp,pquantity,pimg  
    })
    await Products.save()
    .then(resp=>res.status(200).json({message:'Product Added Successfully'}))
    .catch(err=>res.status(409).json({message:'Not added',err}))
})

//Get Products based on Categories

router.get('/getproddata', async (req, res) => {
    try {
        const searchQuery = req.query.search || ''; // Get search query from request
        
        const products = await ProductModel.aggregate([
            {
                $match: { 
                    $or: [
                        { pname: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive product name search
                        { pcategory: { $regex: searchQuery, $options: 'i' } } // Case-insensitive category search
                    ]
                }
            },
            {
                $group: {
                    _id: "$pcategory",  // Group by category
                    products: { $push: "$$ROOT" }  // Push all products into an array
                }
            }
        ]);

        res.status(200).json(products);
    } catch (err) {
        res.status(404).json({ message: 'Products Not Found', error: err });
    }
});


router.put('/updateproddata/:id',(req,res)=>{
    const IdQuery=req.params.id
    ProductModel.findByIdAndUpdate(IdQuery,req.body)
    .then(res.status(200).json({message:'Updated Successfully'}))
    .catch(res.status(409).json({message:"Update Failed"}))
})


router.delete('/delete/:id',(req,res)=>{
    const IdQuery=req.params.id
    ProductModel.findByIdAndDelete(IdQuery)
    .then(resp=>res.status(200).json({message:"Deleted Successfully"}))
    .catch(err=>re.status(404).json({message:"Delete Failed"}))
})


// // Orders Schema

// const OrderSchema = new mongoose.Schema({
//     name: String,
//     mobile: String,
//     address: String,
//     items: [
//         {
//             pname: String,
//             pprice: Number,
//             quantity: Number,
//             subtotal: Number
//         }
//     ],
//     total: Number,
//     date: { type: Date, default: Date.now }
// });

// const Order = mongoose.model("Order", OrderSchema);


// router.post("/order", async (req, res) => {
//     try {
//         const { name, mobile, address, items, total } = req.body;

//         const newOrder = new Order({
//             name,
//             mobile,
//             address,
//             items,
//             total
//         });

//         await newOrder.save();
//         res.status(201).json({ message: "Order Placed Successfully!", order: newOrder });
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });



// router.get('/getorders', async (req, res) => {
//     try {
//         const orders = await Order.find();
//         res.status(200).json(orders);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching orders', error });
//     }
// });


// router.delete('/deleteorder/:id',(req,res)=>{
//     const IdQuery=req.params.id
//     Order.findByIdAndDelete(IdQuery)
//     .then(resp=>res.status(200).json({message:"Deleted Successfully"}))
//     .catch(err=>re.status(404).json({message:"Delete Failed"}))
// })


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

const Order = mongoose.model("Order", OrderSchema);

router.post("/order", async (req, res) => {
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
        res.status(201).json({ message: "Order Placed Successfully!", order: newOrder });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.get('/getorders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error });
    }
});

router.delete('/deleteorder/:id',(req,res)=>{
    const IdQuery=req.params.id
    Order.findByIdAndDelete(IdQuery)
    .then(resp=>res.status(200).json({message:"Deleted Successfully"}))
    .catch(err=>res.status(404).json({message:"Delete Failed"}))
});

router.put('/mark-delivered/:id', async (req, res) => {
    const { deliveredBy } = req.body;
    try {
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







//Admin Offers Post

// Offers Schema

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
        quantity:String,
      }
    ]
  }, { timestamps: true });

  const Offer=mongoose.model("offers", OfferSchema)


// Post

router.post('/postoffers',async(req,res)=>{
    try {
        const newOffer = new Offer(req.body);
        await newOffer.save();
        res.status(201).json({ message: "Offer created successfully!" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
})


// Get

router.get('/getoffers',async(req,res)=>{
    try{
        const offers=await Offer.find()
        res.status(200).json(offers)
    }
    catch(error){
        res.status(500).json({ message: 'Error fetching offers', error });
    }
})


// Delete

router.delete('/deleteoffer/:id', async (req, res) => {
    try {
      const offerId = req.params.id;
      await Offer.findByIdAndDelete(offerId);
      res.status(200).json({ message: "Offer deleted successfully" });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });
  


module.exports=router