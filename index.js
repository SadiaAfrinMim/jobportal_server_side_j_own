const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

app.use(express.json())

app.use(cors(
 {
  origin: ['http://localhost:5173'],
  credentials: true
 }
))
app.use(cookieParser())

const logger = (req,res,next)=>{
  console.log('inside the logger')
  next()
}
const verifyToken = (req,res,next)=>{
  console.log('inside verify token middlewware',req.cookies)
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({message: 'unauthorize access'})
  }
  jwt.verify(token, process.env.JWT_SECRET,(err, decoded)=>{
    if(err){
      return res.status(401).send({message: 'Unauthorized access'})
    }
    res.user = decoded;
    next()
  })
 
}


// DB_USER=newsjobportal
// DB_PASS=VUU7vv80OYloeNOA





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gsnwc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const jobCollection = client.db('jobsportal').collection('jobs');
    const jobApplicationCollection = client.db('jobsportal').collection('Application');

    // AUTH RELATED APIS
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '10h' })
        res.cookie('token', token, {
          httpOnly: true,
          secure: false,
        })
      .send({ success: true });
    });
    

   
    app.post('/jobs',logger, async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
  })

     // ADD DATA
     app.get('/jobs', async (req, res) => {
      const email = req.query.email;
      let query = {}; 
      if(email) {
          query = { hr_email: email };
      }
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
  });

    app.get('/job/:id',async(req,res)=>{
        const id = req.params.id;
        const query ={_id: new ObjectId(id)};
        const result = await jobCollection.findOne(query)
        res.send(result);

    })

    app.get('/job-application', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await jobApplicationCollection.find(query).toArray();

      // fokira way to aggregate data
      for (const application of result) {
          // console.log(application.job_id)
          const query1 = { _id: new ObjectId(application.job_id) }
          const jobs = await jobCollection.findOne(query1);
          if (jobs) {
            application.title = jobs.title,
            application.company = jobs.company
            application.company_logo = jobs.company_logo
          }
      }

      res.send(result);
  
  })




    
   
    // app.get('/job-application',verifyToken ,async(req,res)=>{
    //   const email = req.query.email;
    //   const query = {email: email}
    //   console.log('cuk cuk cookies',req.cookies)
    //   if(req.user.email !== req.query.email){
    //     return res.status(403).send({message: 'forbidden access'})
    //   }
    //   const result = await jobApplicationCollection.find(query).toArray()

    //   for( application of result){
    //     // console.log(application.job_id)
    //     const query1 ={_id: new ObjectId(application.job_id)}
    //     const jobs = await jobCollection.findOne(query1)
    //     if(jobs){
    //       application.title = jobs.title,
    //       application.company = jobs.company
    //       application.company_logo = jobs.company_logo
       

    //     }
       
    //   }
    //   res.send(result)
    // })



    app.post('/job-application', async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);

      // Not the best way (use aggregate) 
      // skip --> it
      const id = application.job_id;
      const query = { _id: new ObjectId(id) }
      const job = await jobCollection.findOne(query);
      let newCount = 0;
      if (job.applicationCount) {
          newCount = job.applicationCount + 1;
      }
      else {
          newCount = 1;
      }

      // now update the job info
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
          $set: {
              applicationCount: newCount
          }
      }

      const updateResult = await jobCollection.updateOne(filter, updatedDoc);

      res.send(result);
  });

  app.get('/job-applications/jobs/:job_id', async (req, res) => {
    const jobId = req.params.job_id;
    const query = { job_id: jobId }
    const result = await jobApplicationCollection.find(query).toArray();
    res.send(result);
})



  app.patch('/job-application/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
        $set: {
            status: data.status
        }
    }
    const result = await jobCollection.updateOne(filter, updatedDoc);
    res.send(result)
})



    app.delete('/job-application/:id',async(req,res)=>{
      const id = req.params.id;
      const query ={_id:new ObjectId(id)}
      const result = await jobApplicationCollection.deleteOne(query)
      res.send(result)
    })

  

    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('simple curd is running');
})
app.listen(port,()=>{
    console.log(`simple port is running ${port}`)
})