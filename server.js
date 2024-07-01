import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("server is ready");
});

app.get("/api/jokes", (req, res) => {
  const jokes = [
    {
      id: 1,
      title: "Why don't scientists trust atoms?",
      content: "Because they make up everything!",
    },
    {
      id: 2,
      title: "Why did the scarecrow win an award?",
      content: "Because he was outstanding in his field!",
    },
    {
      id: 3,
      title: "Why don't skeletons fight each other?",
      content: "They don't have the guts.",
    },
    {
      id: 4,
      title: "What do you call fake spaghetti?",
      content: "An impasta.",
    },
    {
      id: 5,
      title: "Why couldn't the bicycle stand up by itself?",
      content: "It was two-tired.",
    },
    {
      id: 6,
      title: "What did the grape do when he got stepped on?",
      content: "Nothing, he just let out a little wine.",
    },
    {
      id: 7,
      title: "Why was the math book sad?",
      content: "Because it had too many problems.",
    },
    {
      id: 8,
      title: "What do you call cheese that isn't yours?",
      content: "Nacho cheese.",
    },
    {
      id: 9,
      title: "Why did the golfer bring two pairs of pants?",
      content: "In case he got a hole in one.",
    },
    {
      id: 10,
      title: "How do you organize a space party?",
      content: "You planet.",
    },
  ];
  res.send(jokes);
});

app.listen(port, () => {
  console.log(`Server is listen on http://localhost:${port}`);
});
