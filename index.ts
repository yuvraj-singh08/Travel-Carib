import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv';
dotenv.config()

//Router Imports
import queryRoutes from './src/routes/queryRoutes';
import kiuRoutes from './src/routes/kiuRoutes';

const app = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('The server is working fine and running on port 8000'); // Replace with your desired response
});

app.use('/',queryRoutes)
app.use('/kiu',kiuRoutes);


const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`> App running on port ${PORT} ...`);
});
