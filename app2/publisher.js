// required node modules
const express = require('express')
const app = express()
const bodyParser=require('body-parser')
const request = require("request")

// use section
app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static('public'));
app.set('view engine', 'ejs')
app.use(bodyParser.json());
app.listen(4400);

//Get method to show homepage
app.get('/', function (request, response) {
  response.render('publisher');
})
