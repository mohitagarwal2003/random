// Import necessary modules
import fetch from "node-fetch"; // Make sure to install node-fetch if not already installed

// Simulated database for favorite colors
const userColorDb = {
  1: "blue",
  2: "red",
  3: "green",
  4: "yellow",
  5: "purple",
};

// Function to fetch user posts from an external API
async function fetchUserPosts(userId) {
  try {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/posts?userId=${userId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user posts");
    }

    const posts = await response.json();
    return posts;
  } catch (error) {
    throw new Error(
      `Error fetching posts for user ${userId}: ${error.message}`
    );
  }
}

// Controller class with a method to process user data
class PostController {
  static async processUserData(req, res, next) {
    try {
      const userId = parseInt(req.params.userId);

      // Check if user exists in the simulated database
      if (!userColorDb[userId]) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch posts for the given user
      const posts = await fetchUserPosts(userId);

      // Find unique categories (assumed to be the first word of each post title)
      const uniqueCategories = [
        ...new Set(posts.map((post) => post.title.split(" ")[0])),
      ];

      // Add the user's favorite color from the userColorDb
      const favoriteColor = userColorDb[userId];

      // Send the processed data as a JSON response
      res.json({
        userId,
        favoriteColor,
        uniqueCategories,
      });
    } catch (error) {
      // Call the next middleware with the error
      next(error);
    }
  }
}

export default PostController;
