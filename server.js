
const express = require('express')
// const bodyparser = require('bodyparser')

// create an express.js instance:
const app = express()
// config express.js
app.use(express.json())
app.set('port',3000)
app.use ((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
 
    next();
})

const MongoClient = require('mongodb').MongoClient;

let db;

MongoClient.connect('mongodb+srv://syedisrar:israr@cluster0.zf7pg.mongodb.net'),(err, client) => {
db = client.db('webstore')
}

app.get('/test', (req,res,next) =>{
    res.send('select a collection, e.g., /collection/messages')
})

app.get('/', (req,res,next) =>{
    res.send('select a collection, e.g., /collection/messages')
})

app.param('collectionname', (req, res, next , collectionname ) => {
    req.collection = db.collection(collectionname)
    return next()
})

app.get('/collection/:collectionname', (req, res, next) =>{
    req.collection.find({}).ToArray((e, results) => {
        if (e) return next(e)
            res.send(results)
    })
})
app.post('/collection/collectionname', (req,res, next) => {
    req.collection.insert(req.body, (e,results) => {
        if (e) return next(e)
            res.send(results.ops)
    })
})

const ObjectID = require('mongodb').ObjectID;
app.get('/collection/:collectionname/:id'
    , (req, res, next) => {
        req.collection.findOne({_id: new ObjectID(req.params.id)}, (e, results) => {
            if (e) return next(e)
                res.send(result)   
        })
    }
)


app.listen(3000, () => {
    console.log('Express.js server running at localhost:3000')
})

