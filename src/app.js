import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';


const app=express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit: "16kb"})); // request taken from JSON

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
})) // request taken from url


app.use(express.static("public"));
app.use(cookieParser());

export default app;
