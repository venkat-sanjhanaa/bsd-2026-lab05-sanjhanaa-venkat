import { loadTest } from "loadtest";

const options = {
  url: "http://127.0.0.1:8000/character",
  method: "POST",
  body: {
    name: "Alice",
    race: "elf",
    intelligence: 25,
  },
  contentType: "application/json",
  maxRequests: 2500,
  client: 25,
};
async function runLoadTest() {
  const result = await loadTest(options);
  result.show();
  console.log("Load test finished.");
}
runLoadTest();
