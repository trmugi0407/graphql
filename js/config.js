/* config.js — constants & shared state */

const DOMAIN = "learn.01founders.co"; // lowercase — correct endpoint
const GQL_URL = `https://${DOMAIN}/api/graphql-engine/v1/graphql`;
const SIGNIN_URL = `https://${DOMAIN}/api/auth/signin`;

const STATE = {
  jwt: null,
  userId: null,
  profileData: {},
};

/* Colour palette — enough for any student, any number of projects/skills */
const PALETTE = [
  "#ff6384",
  "#36a2eb",
  "#ffcd56",
  "#4bc0c0",
  "#9966ff",
  "#ff9f40",
  "#00e5ff",
  "#ff3cac",
  "#00ff9d",
  "#ffb800",
  "#7b61ff",
  "#4caf50",
];
