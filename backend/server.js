require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create Razorpay order
app.post('/create-order', async (req, res) => {
    try {
        const options = {
            amount: 100, // amount in the smallest currency unit (paise)
            currency: 'INR',
            receipt: 'ebook_' + Date.now()
        };

        const order = await razorpay.orders.create(options);
        
        res.json({
            key: process.env.RAZORPAY_KEY_ID,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
});

// Verify payment
app.post('/verify-payment', (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                                     .update(razorpay_order_id + "|" + razorpay_payment_id)
                                     .digest('hex');
    
    if(generated_signature === razorpay_signature) {
        // Payment is authentic
        // In a real application, you would:
        // 1. Save the payment details to your database
        // 2. Maybe send a confirmation email
        // 3. Generate a unique download link
        
        const download_url = '/download-ebook?payment_id=' + razorpay_payment_id;
        
        res.json({
            success: true,
            download_url: download_url
        });
    } else {
        res.status(400).json({ success: false, error: 'Invalid signature' });
    }
});

// Serve the ebook file (in a real app, you'd want to secure this better)
app.get('/download-ebook', (req, res) => {
    const { payment_id } = req.query;
    
    // In a real application, you would:
    // 1. Verify the payment_id exists in your database
    // 2. Check if the download limit hasn't been exceeded
    // 3. Maybe track downloads
    
    const filePath = path.join(__dirname, 'download', 'draft3.pdf');
    
    if(fs.existsSync(filePath)) {
        res.download(filePath, 'ChatGPT for Teachers.pdf', (err) => {
            if(err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file');
            }
        });
    } else {
        res.status(404).send('Ebook file not found');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});