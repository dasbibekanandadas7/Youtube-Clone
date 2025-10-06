// require('dotenv').config({path:'./env'})

import dotenv from 'dotenv';
const ref=dotenv.config();
console.log("refereence:::",ref);

import connectDB from "./database/index.js";
import express from "express";
import app from "./app.js";



connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`server is running at port: ${process.env.PORT}`);
    });
})
.catch((err)=>{
    console.log("MongoDB connection error: ", err);
})














// import express from 'express';
// const app=express();


// ;(async()=>{
//     try {
//          await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//          app.on("error",(error)=>{
//             console.log("Error: ",error);
//             throw error;
//          })

//          app.listen(process.env.PORT,()=>{
//             console.log(`App is listening on PORT: ${process.env.PORT}`)
//          })
//     } catch (error) {
//         console.error("error: ",error);
//         throw error;
//     }
// })();
