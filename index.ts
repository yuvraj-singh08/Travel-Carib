import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv';
dotenv.config()

//Router Imports
import queryRoutes from './src/routes/queryRoutes';
import kiuRoutes from './src/routes/kiuRoutes';
import flightRoutes from './src/routes/flightRoutes';
import duffelRoutes from './src/routes/duffelRoutes';
import userRoutes from './src/routes/userRoutes';
import { initMongo } from './config/mongo';

const app = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: '*', // Allow all origins
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('The server is working fine and running on port 8000'); // Replace with your desired response
});
app.use('/user', userRoutes);
app.use('/', queryRoutes)
app.use('/kiu', kiuRoutes);
app.use('/flight', flightRoutes);
app.use('/duffel', duffelRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`> App running on port ${PORT}  ...`);
    try {
        initMongo();
    } catch (error) {
        
    }
});
