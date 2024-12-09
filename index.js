const port = process.env.PORT || 3050;
const express = require('express');
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken')
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Database connection
mongoose.connect("mongodb+srv://achintyashri2205:9695047580@cluster0.x2wm1.mongodb.net/e-commerce", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// API Creation Endpoint
app.get("/", (req, res) => {
    res.send("Express App is Running");
});

// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// Creating Upload Endpoint for images
app.use('/images', express.static('./upload/images'));

//Creating upload get endpoint for images
app.get('/upload',(req,res)=>{
    res.send("Upload endpoint is available, Use POST to upload files.")
})

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`,
    });
});

// Creating a Schema of Products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

// Creating Endpoint to add a product
app.post('/addproduct', async (req, res) => {
    try {
        let products = await Product.find({});
        let id;
        if (products.length > 0) {
            let last_product_array = products.slice(-1);
            let last_product = last_product_array[0];
            id = last_product.id + 1;
        } else {
            id = 1;
        }

        const product = new Product({
            id: id,
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            new_price: req.body.new_price,
            old_price: req.body.old_price,
    
        });

        await product.save();
        console.log("Saved");
        res.json({
            success: true,
            name: req.body.name,
        });
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ success: false, message: "Error adding product" });
    }
});

// Creating API for deleting Product
app.post('/removeproduct', async (req, res) => {
    const result = await Product.findOneAndDelete({ id: req.body.id });
    if (result) {
        console.log("Removed");
        res.json({ success: true, name: req.body.name });
    } else {
        res.status(404).json({ success: false, message: "Product not found" });
    }
});

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
});


// User Schema 

const Users = mongoose.model('Users',{
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now(),
    }
})


// Create Endpoint for registering the user.
app.get('/signup',async (req,res)=>{
    res.send("Signup Section Getting")
})


app.post('/signup',async (req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found of same email."})
    }
    let cart = {}
    for(let i = 0 ; i< 300; i++){
        cart[i] = 0;
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data = {
        user: {
            id: user.id,
        }
    }

    const token = jwt.sign(data,'secret_ecom')

    res.json({success:true,token})
})

// creating endpoint for user login
app.post('/login', async (req,res)=>{
    let user = await Users.findOne({email: req.body.email})
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user: {
                    id: user.id,
                }
            }
            const token = jwt.sign(data,'secret_ecom')
            res.json({success:true,token})
        }
        else{
            res.json({success:false,errors:"Wrong Password"})
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Id"})
    }
})

// Creating Endpoint for new collection data.
app.get('/newcollections',async (req,res)=>{
    let products = await  Product.find({})
    let newcollection = products.slice(1).slice(-8)
    console.log("New Collection Fetched")
    res.send(newcollection)
})


// Creating Endpoint for popular in women section
app.get('/popularinwomen',async (req,res)=>{
    let products = await Product.find({category:"women"})
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched")
    res.send(popular_in_women);
})

// Creating middleware to fetch user
const fetchUser = async (req,res,next) => {
    const token = req.header('auth-token')
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom')
            req.user = data.user
            next();
        } catch (error){
            res.status(401).send({errors:"Please authenticate using a valid token"})
        }
    }
}


// Creating Endpoint for adding products in cartdata
app.post('/addtocart', fetchUser ,async (req,res)=>{
    console.log("Added",req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id})
    userData.cartData[req.body.itemId] += 1
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Added")

}) 


// Creating Endpoint to remove product from cartData
app.post('/removefromcart',fetchUser,async (req,res)=>{
    console.log("removed",req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id})
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Removed")
})


// Creating Endpoint to get cart data
app.post('/getcart',fetchUser, async (req,res)=>{
    console.log("GetCart")
    let userData = await Users.findOne({_id:req.user.id})
    res.json(userData.cartData);
})


// Starting the server
app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on Port " + port);
    } else {
        console.log("Server is not Running: " + error);
    }
});