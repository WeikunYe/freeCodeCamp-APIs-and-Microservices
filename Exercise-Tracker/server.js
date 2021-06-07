// Solution for https://www.freecodecamp.org/learn/apis-and-microservices/apis-and-microservices-projects/exercise-tracker
// Serve on Replit
// Demo: https://boilerplate-project-exercisetracker.weikunye.repl.co
// Author: Weikun Ye
// Email: weikunye1225@gmail.com

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const shortid = require("shortid");
const moment = require("moment");

mongoose.connect(process.env.MLAB_URI);

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create UserSchema
const UserSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: shortid.generate,
  },
  username: {
    type: String,
    unique: true,
    required: true,
  },
});

mongoose.model("User", UserSchema);
const User = mongoose.model("User");

// Create ExerciseSchema
const ExerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: String,
    required: true,
  },
});

mongoose.model("Exercise", ExerciseSchema);

const Exercise = mongoose.model("Exercise");

// Get all users in the DB
app.get("/api/users", (req, res) => {
  User.find({}).then((users) => {
    res.json(users);
  });
});


// Create a new user
app.post("/api/users", (req, res) => {
  const { username } = req.body;
  User.findOne({ username })
    .then((user) => {
      if (user) throw new Error("username already taken");
      return User.create({ username });
    })
    .then((user) =>
      res.status(200).send({
        username: user.username,
        _id: user._id,
      })
    )
    .catch((err) => {
      console.log(err);
      res.status(500).send(err.message);
    });
});

// Create a new exercise for an exiting user
app.post("/api/users/:_id/exercises", (req, res) => {
  let { description, duration, date } = req.body;
  let userId = req.params._id;
  User.findOne({ _id: userId })
    .then((user) => {
      if (!user) throw new Error("Unknown user with _id");
      date = date || Date.now();
      return Exercise.create({
        description,
        duration,
        date,
        userId,
      }).then((ex) =>
        res.status(200).json({
          _id: user._id,
          username: user.username,
          date: moment(ex.date).format("ddd MMM DD YYYY"),
          duration: parseInt(duration),
          description: description,
        })
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err.message);
    });
});

// Get users' exercise logs
app.get("/api/users/:_id/logs", (req, res) => {
  let { from, to, limit } = req.query;
  let userId = req.params._id;
  from = moment(from, "YYYY-MM-DD").isValid() ? moment(from, "YYYY-MM-DD") : 0;
  to = moment(to, "YYYY-MM-DD").isValid()
    ? moment(to, "YYYY-MM-DD")
    : moment().add(1000000000000);
  User.findById(userId)
    .then((user) => {
      if (!user) throw new Error("Unknown user with _id");
      Exercise.find({ userId })
        .where("date")
        .gte(from)
        .lte(to)
        .limit(+limit)
        .exec()
        .then((log) =>
          res.status(200).send({
            _id: userId,
            username: user.username,
            count: log.length,
            log: log.map((o) => ({
              description: o.description,
              duration: o.duration,
              date: moment(o).format("ddd MMMM DD YYYY"),
            })),
          })
        );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err.message);
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
