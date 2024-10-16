import express from "express";
const router = express.Router();
import PostController from "./../controller/posts.js";

// Define a route
// router.get("/users/:userId/data", (req, res) => {
//   PostController.processUserData().then((result) => {
//     res.send({ data: result });
//   });
// });
router.get("/users/:userId/data", PostController.processUserData);

// Export the router
export default router;

//to do. try with make function non static and create object
