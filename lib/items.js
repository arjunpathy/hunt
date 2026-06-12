export const OFFICE_ITEMS = [
  {
    id: 1,
    name: "Stapler",
    keywords: ["stapler"],
    riddle:
      "I have a mouth full of metal teeth and bite paper to hold it together. What am I?",
  },
  {
    id: 2,
    name: "Coffee Mug",
    keywords: ["coffee mug", "cup", "beaker"],
    riddle:
      "I'm warm in the morning, hold your energy, and ask nothing in return. What am I?",
  },
  {
    id: 3,
    name: "Scissors",
    keywords: ["scissors"],
    riddle:
      "I have two arms and two legs but no body. I cut but never bleed. What am I?",
  },
  {
    id: 4,
    name: "Computer Mouse",
    keywords: ["mouse"],
    riddle:
      "I have a back but can't stand up straight. I glide across a surface and help you navigate. What am I?",
  },
  {
    id: 5,
    name: "Keyboard",
    keywords: ["keyboard"],
    riddle:
      "I have many keys but open no doors. The more you press me, the more words pour. What am I?",
  },
  {
    id: 6,
    name: "Water Bottle",
    keywords: ["bottle"],
    riddle:
      "I can hold a river but fit in your hand. I keep you refreshed throughout the land. What am I?",
  },
  {
    id: 7,
    name: "Pen",
    keywords: ["pen"],
    riddle:
      "The more I work, the thinner I get. I leave my mark without regret. What am I?",
  },
  {
    id: 8,
    name: "Notebook",
    keywords: ["notebook", "book"],
    riddle:
      "I start blank but fill with knowledge. I'm bound but love to roam. What am I?",
  },
  {
    id: 9,
    name: "The Hunt Master",
    keywords: ["person"],
    type: "person",
    riddle:
      "I set this hunt in motion, I hold all the answers. Find the one who started it all. Who am I?",
  },
];

export const shuffleItems = (seed) => {
  let shuffled = [...OFFICE_ITEMS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
};
