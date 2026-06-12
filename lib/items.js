export const OFFICE_ITEMS = [
  { id: 1, name: "Stapler", keywords: ["stapler"] },
  { id: 2, name: "Coffee Mug", keywords: ["coffee mug", "cup", "beaker"] },
  { id: 3, name: "Scissors", keywords: ["scissors"] },
  { id: 4, name: "Computer Mouse", keywords: ["mouse"] },
  { id: 5, name: "Keyboard", keywords: ["keyboard"] },
  { id: 6, name: "Water Bottle", keywords: ["bottle"] },
  { id: 7, name: "Pen", keywords: ["pen"] },
  { id: 8, name: "Notebook", keywords: ["notebook", "book"] },
];

export const shuffleItems = (seed) => {
  let shuffled = [...OFFICE_ITEMS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
};
